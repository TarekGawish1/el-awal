import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncConflictsModal } from '../components/SyncConflictsModal';
import { syncEngine } from '@/lib/offline/sync-engine';
import { offlineDb } from '@/lib/offline/db';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...mod,
    apiClient: vi.fn(),
    isAccessTokenExpiredOrExpiring: vi.fn(() => false),
    refreshAccessToken: vi.fn(async () => 'fresh-token'),
  };
});

const makeConflict = (overrides: Partial<any> = {}) => ({
  id: 'conflict-1',
  operationId: 'mut-1',
  domain: 'attendance',
  reason: 'تجاوز الحد الأقصى للمحاولات (3): Authentication required to access this resource',
  payload: { sessionId: 's-1', qrCodeToken: 'qr-1', studentId: 'stu-1', status: 'PRESENT' },
  timestamp: Date.now(),
  resolved: false,
  ...overrides,
});

describe('SyncConflictsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(offlineDb, 'getBookletsOffline').mockResolvedValue([]);
    vi.spyOn(offlineDb, 'resolveConflict').mockResolvedValue();
    vi.spyOn(offlineDb, 'getConflicts').mockResolvedValue([]);
  });

  it('does not render when closed', () => {
    const { container } = render(
      <SyncConflictsModal isOpen={false} onClose={vi.fn()} conflicts={[]} onResolve={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows empty state when there are no conflicts', () => {
    render(
      <SyncConflictsModal isOpen={true} onClose={vi.fn()} conflicts={[]} onResolve={vi.fn()} />,
    );
    expect(screen.getByText(/لا توجد أي تعارضات مزامنة معلقة/)).toBeDefined();
  });

  it('maps raw 401 error reason to clean Arabic message without exposing codes', () => {
    const conflict = makeConflict();
    render(
      <SyncConflictsModal
        isOpen={true}
        onClose={vi.fn()}
        conflicts={[conflict]}
        onResolve={vi.fn()}
      />,
    );

    expect(screen.getByText('انتهت صلاحية جلسة تسجيل الدخول أثناء المزامنة')).toBeDefined();
    // Raw internal strings must NOT be visible
    expect(screen.queryByText(/Authentication required/)).toBeNull();
    expect(screen.queryByText(/تجاوز الحد الأقصى للمحاولات/)).toBeNull();
  });

  it('shows "Retry All" banner and triggers retryConflicts on click', async () => {
    const retrySpy = vi.spyOn(syncEngine, 'retryConflicts').mockResolvedValue(1);
    const onClose = vi.fn();
    const conflict = makeConflict();

    render(
      <SyncConflictsModal
        isOpen={true}
        onClose={onClose}
        conflicts={[conflict]}
        onResolve={vi.fn()}
      />,
    );

    const retryBtn = screen.getByRole('button', { name: /إعادة محاولة الكل \(1\)/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('maps booklet grade mismatch to Arabic card without raw codes', () => {
    const conflict = makeConflict({
      id: 'conflict-booklet',
      domain: 'finance',
      reason: 'تعذر إتمام العملية على الخادم: BOOKLET_GRADE_MISMATCH (الصف الثالث الثانوي != الصف الأول الثانوي)',
      payload: {
        studentId: 'stu-1',
        bookletId: 'bkl-1',
        paymentType: 'BOOKLET',
        amountPaid: 200,
        paymentMethod: 'CASH',
      },
    });

    render(
      <SyncConflictsModal
        isOpen={true}
        onClose={vi.fn()}
        conflicts={[conflict]}
        onResolve={vi.fn()}
      />,
    );

    expect(screen.getByText('تعارض في الصف الدراسي للمذكرة')).toBeDefined();
    // Raw internal codes must NOT appear
    expect(screen.queryByText(/BOOKLET_GRADE_MISMATCH/)).toBeNull();
    expect(screen.queryByText(/!=/)).toBeNull();
  });

  it('calls onResolve with "إلغاء" note when discard is clicked', async () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const conflict = makeConflict();

    render(
      <SyncConflictsModal
        isOpen={true}
        onClose={vi.fn()}
        conflicts={[conflict]}
        onResolve={onResolve}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تجاهل' }));
    await waitFor(() => {
      expect(onResolve).toHaveBeenCalledWith('conflict-1', 'إلغاء العملية يدوياً');
    });
  });
});

// ---------------------------------------------------------------------------
// Sync engine auth-guard tests
// ---------------------------------------------------------------------------

// Minimal refresh-token-like JWT for the auth-guard tests
const FAKE_REFRESH = 'fake-refresh-token';

describe('syncEngine.flushOutbox auth guard', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await offlineDb.wipeAllOfflineData();
    localStorage.clear();
  });

  it('pauses flush without failing mutations when refresh token is present but refresh call fails', async () => {
    // Seed a refresh token so the guard activates, then make the refresh fail
    localStorage.setItem('el_awal_refresh_token', FAKE_REFRESH);
    vi.mocked(clientModule.isAccessTokenExpiredOrExpiring).mockReturnValue(true);
    vi.mocked(clientModule.refreshAccessToken).mockResolvedValue(null);

    // Enqueue a mutation while simulating no session
    await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/s-1/scan-qr',
      'POST',
      { sessionId: 's-1', qrCodeToken: 'qr-1', studentId: 'stu-1' },
    );

    const result = await syncEngine.flushOutbox({ force: true });

    // Mutation should still be in the outbox (not failed)
    const pending = await offlineDb.getPendingMutations();
    expect(pending.length).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('does not count 401 errors against mutation retry counter', async () => {
    // No refresh token → guard is skipped; apiClient mock returns 401
    vi.mocked(clientModule.isAccessTokenExpiredOrExpiring).mockReturnValue(false);
    vi.mocked(clientModule.refreshAccessToken).mockResolvedValue('token');
    vi.mocked(clientModule.apiClient).mockRejectedValue(
      Object.assign(new Error('Authentication required to access this resource'), { statusCode: 401 }),
    );

    const mutId = await syncEngine.enqueue(
      'attendance',
      '/attendance/sessions/s-1/scan-qr',
      'POST',
      { sessionId: 's-1', qrCodeToken: 'qr-1', studentId: 'stu-1' },
    );

    await syncEngine.flushOutbox({ force: true });

    const pending = await offlineDb.getPendingMutations();
    const mut = pending.find((m) => m.id === mutId);
    // Should remain in outbox with retryCount still 0 (not incremented)
    expect(mut).toBeDefined();
    expect(mut!.retryCount).toBe(0);
    // Should NOT have been promoted to a conflict
    const conflicts = await offlineDb.getConflicts();
    expect(conflicts.find((c) => c.operationId === mutId)).toBeUndefined();
  });
});
