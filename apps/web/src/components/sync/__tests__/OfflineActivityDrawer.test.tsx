import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineActivityDrawer } from '../OfflineActivityDrawer';
import { syncEngine } from '@/lib/offline/sync-engine';

describe('OfflineActivityDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OfflineActivityDrawer isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('closes via close button, backdrop click, and Escape key', async () => {
    vi.spyOn(syncEngine, 'getDetailedPendingActivity').mockResolvedValue([]);

    const handleClose = vi.fn();
    render(<OfflineActivityDrawer isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByText('لا توجد عمليات معلقة حالياً')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(3);
  });
});
