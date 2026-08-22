import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncReviewModal } from '../SyncReviewModal';
import { syncEngine } from '@/lib/offline/sync-engine';

describe('SyncReviewModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders outgoing and incoming summaries and executes bidirectional sync', async () => {
    vi.spyOn(syncEngine, 'isOnline').mockReturnValue(true);
    vi.spyOn(syncEngine, 'getPendingOutboxSummary').mockResolvedValue({
      students: [
        {
          id: 'temp-s-1',
          fullName: 'زياد طارق',
          phone: '01099998888',
          gradeLevel: 'الصف الأول الثانوي',
          groupName: 'مجموعة الفيزياء 1',
        },
      ],
      groups: [
        {
          id: 'temp-g-1',
          name: 'مجموعة الكيمياء المتقدمة',
          gradeLevel: 'الصف الثاني الثانوي',
          monthlyFee: 350,
        },
      ],
      attendanceCount: 5,
      paymentsCount: 2,
      totalCount: 9,
    });

    vi.spyOn(syncEngine, 'getSyncDiff').mockResolvedValue({
      groups: {
        count: 1,
        items: [{ id: 'g-srv-1', name: 'مجموعة الأحياء', gradeLevel: 'الصف الأول الثانوي' }],
      },
      students: {
        count: 1,
        items: [{ id: 's-srv-1', fullName: 'ياسمين حسام', studentCode: 'STU-2026-00010' }],
      },
      attendance: { count: 3, items: [] },
      payments: { count: 1, items: [] },
      serverTime: new Date().toISOString(),
    });

    const mockExecute = vi
      .spyOn(syncEngine, 'executeBidirectionalSync')
      .mockImplementation(async (onProgress) => {
        onProgress?.(50, 'رفع البيانات...');
        return { synced: 9, failed: 0 };
      });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <SyncReviewModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Verify Outgoing Summary loaded
    await waitFor(() => {
      expect(screen.getByText('مراجعة المزامنة السحابية')).toBeDefined();
      expect(screen.getByText('زياد طارق')).toBeDefined();
      expect(screen.getByText('مجموعة الكيمياء المتقدمة')).toBeDefined();
      expect(screen.getByText(/350 ج\.م \/ شهر/)).toBeDefined();
      expect(screen.getByText('5 تسجيل')).toBeDefined();
      expect(screen.getByText('2 عملية')).toBeDefined();
    });

    // Switch to Incoming Tab
    const incomingTabBtn = screen.getByRole('button', { name: /بيانات للتحميل/i });
    fireEvent.click(incomingTabBtn);

    await waitFor(() => {
      expect(screen.getByText('مجموعة الأحياء')).toBeDefined();
      expect(screen.getByText('ياسمين حسام')).toBeDefined();
    });

    // Trigger Bidirectional Sync
    const syncNowBtn = screen.getByRole('button', { name: /تأكيد ومزامنة الآن/i });
    fireEvent.click(syncNowBtn);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
      expect(screen.getByText('اكتملت المزامنة بنجاح! تم تحديث جميع السجلات والتخزين المحلي.')).toBeDefined();
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SyncReviewModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
