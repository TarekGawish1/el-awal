import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncConfirmationModal } from '../SyncConfirmationModal';
import { syncEngine } from '@/lib/offline/sync-engine';
import { offlineDb } from '@/lib/offline/db';
import * as client from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: 'http://localhost:3000/api/v1',
}));

describe('Reconnection Confirmation Gate & <SyncConfirmationModal />', () => {
  let originalNavigatorOnLine: boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    await offlineDb.wipeAllOfflineData();
    originalNavigatorOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
    });
  });

  it('pauses automatic dispatching on reconnection and only sends HTTP requests once "Sync Now" is clicked', async () => {
    // 1. Seed a pending offline tuition payment mutation in the outbox
    await offlineDb.putStudent({
      id: 'stu-recon-1',
      fullName: 'كريم عادل',
      studentCode: 'STU-RC-1',
      qrCodeToken: 'qr-recon-1',
      user: { fullName: 'كريم عادل', isActive: true },
    } as any);

    await offlineDb.enqueueMutation({
      id: 'mut-recon-1',
      domain: 'finance',
      endpoint: '/subscriptions/record',
      method: 'POST',
      payload: {
        id: 'pay-recon-1',
        studentId: 'stu-recon-1',
        groupId: 'grp-recon-1',
        periodYear: 2026,
        periodMonth: 9,
        amountPaid: 300,
        paymentMethod: 'CASH',
      },
      clientTimestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      optimisticId: 'pay-recon-1',
    });

    // 2. Force a deterministic "connection restored" transition without hitting the network
    vi.spyOn(syncEngine, 'verifyConnection').mockResolvedValue(true);

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));

    // 3. Silent auto-syncing must be disabled: the engine pauses and requires explicit confirmation
    await waitFor(() => {
      expect(syncEngine.isSyncConfirmationRequired()).toBe(true);
    });
    expect(client.apiClient).not.toHaveBeenCalled();

    // Automatic background triggers must also stay blocked while confirmation is pending
    syncEngine.triggerSync();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(client.apiClient).not.toHaveBeenCalled();

    // 4. Render the confirmation modal, as <DashboardLayout /> would upon SYNC_REVIEW_REQUIRED
    render(<SyncConfirmationModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('تم استعادة الاتصال بالإنترنت')).toBeDefined();
      expect(screen.getByText(/كريم عادل/)).toBeDefined();
    });

    // Still no HTTP dispatch until the user explicitly confirms
    expect(client.apiClient).not.toHaveBeenCalled();

    vi.mocked(client.apiClient).mockResolvedValue({
      processedOperationIds: ['mut-recon-1'],
      syncedCount: 1,
      duplicatesIgnored: 0,
      failedCount: 0,
      idMappings: {},
    });

    // 5. Clicking "Sync Now" dispatches the confirmed batch to the server
    const syncNowBtn = screen.getByRole('button', { name: /Sync Now/i });
    fireEvent.click(syncNowBtn);

    await waitFor(() => {
      expect(client.apiClient).toHaveBeenCalled();
      expect(syncEngine.isSyncConfirmationRequired()).toBe(false);
    });

    // The synced mutation must be gone from the outbox
    const pendingAfter = await offlineDb.getPendingMutations();
    expect(pendingAfter.find((m) => m.id === 'mut-recon-1')).toBeUndefined();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SyncConfirmationModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
