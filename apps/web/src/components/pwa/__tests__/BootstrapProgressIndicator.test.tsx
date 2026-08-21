import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BootstrapProgressIndicator } from '../BootstrapProgressIndicator';
import * as useBootstrapSyncModule from '@/lib/offline/useBootstrapSync';

describe('BootstrapProgressIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders progress and dismisses immediately when clicking the close button', () => {
    vi.spyOn(useBootstrapSyncModule, 'useBootstrapSync').mockReturnValue({
      isBootstrapping: false,
      percentage: 100,
      message: 'تم تجهيز مساحة العمل بنجاح والجاهزية للعمل بدون إنترنت 🚀',
      lastEvent: {
        type: 'SUCCESS',
        percentage: 100,
        message: 'تم تجهيز مساحة العمل بنجاح والجاهزية للعمل بدون إنترنت 🚀',
      },
      triggerBootstrap: vi.fn(),
    });

    const { container } = render(<BootstrapProgressIndicator />);

    // Verify indicator is visible
    expect(screen.getByText('جاهز للعمل بدون إنترنت')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();

    // Find and click the close button
    const closeBtn = screen.getByRole('button', { name: /إغلاق الإشعار/i });
    expect(closeBtn).toBeDefined();

    act(() => {
      fireEvent.click(closeBtn);
    });

    // Verify indicator is dismissed and removed from DOM
    expect(screen.queryByText('جاهز للعمل بدون إنترنت')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('auto-dismisses after timeout when bootstrap is complete', () => {
    vi.spyOn(useBootstrapSyncModule, 'useBootstrapSync').mockReturnValue({
      isBootstrapping: false,
      percentage: 100,
      message: 'تم تجهيز مساحة العمل بنجاح',
      lastEvent: {
        type: 'SUCCESS',
        percentage: 100,
        message: 'تم تجهيز مساحة العمل بنجاح',
      },
      triggerBootstrap: vi.fn(),
    });

    const { container } = render(<BootstrapProgressIndicator />);

    expect(screen.getByText('جاهز للعمل بدون إنترنت')).toBeDefined();

    // Fast-forward 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('جاهز للعمل بدون إنترنت')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('can be closed during active bootstrapping without reappearing', () => {
    vi.spyOn(useBootstrapSyncModule, 'useBootstrapSync').mockReturnValue({
      isBootstrapping: true,
      percentage: 50,
      message: 'حفظ سجلات الطلاب والمجموعات والحصص محلياً...',
      lastEvent: {
        type: 'PROGRESS',
        percentage: 50,
        message: 'حفظ سجلات الطلاب والمجموعات والحصص محلياً...',
      },
      triggerBootstrap: vi.fn(),
    });

    const { container } = render(<BootstrapProgressIndicator />);

    expect(screen.getByText('تجهيز مساحة العمل المحلية')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /إغلاق الإشعار/i });
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText('تجهيز مساحة العمل المحلية')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
