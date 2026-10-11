import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { CameraPermissionModal } from '../CameraPermissionModal';
import { CameraPermissionOverlay } from '../CameraPermissionOverlay';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CameraPermissionModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CameraPermissionModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders guide content when isOpen is true', () => {
    render(
      <CameraPermissionModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('كيفية تفعيل صلاحية الكاميرا')).toBeInTheDocument();
    expect(screen.getByText(/تم حظر إذن الكاميرا مسبقاً/i)).toBeInTheDocument();
    expect(screen.getByText('لقد منحت الإذن - تشغيل الكاميرا الآن')).toBeInTheDocument();
  });

  it('handles permission retry and success when getUserMedia succeeds', async () => {
    const mockStop = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockStop }],
    };

    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    const onGranted = vi.fn();
    const onClose = vi.fn();

    render(
      <CameraPermissionModal
        isOpen={true}
        onClose={onClose}
        onPermissionGranted={onGranted}
      />
    );

    const retryBtn = screen.getByText('لقد منحت الإذن - تشغيل الكاميرا الآن');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalled();
      expect(onGranted).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('تم تفعيل صلاحية الكاميرا'));
    });
  });

  it('handles permission retry and error when getUserMedia rejects with NotAllowedError', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    render(
      <CameraPermissionModal isOpen={true} onClose={vi.fn()} />
    );

    const retryBtn = screen.getByText('لقد منحت الإذن - تشغيل الكاميرا الآن');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('ما زالت صلاحية الكاميرا محظورة'), expect.any(Object));
    });
  });
});

describe('CameraPermissionOverlay Component', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(
      <CameraPermissionOverlay
        error={null}
        isRequesting={false}
        onRequestPermission={vi.fn()}
        onOpenGuide={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders permission prompt and buttons when error is present', () => {
    const onRequest = vi.fn();
    const onGuide = vi.fn();

    render(
      <CameraPermissionOverlay
        error="تم رفض صلاحية استخدام الكاميرا."
        isRequesting={false}
        onRequestPermission={onRequest}
        onOpenGuide={onGuide}
      />
    );

    expect(screen.getByText('الكاميرا بحاجة إلى إذن التشغيل')).toBeInTheDocument();
    
    const requestBtn = screen.getByRole('button', { name: /منح إذن الكاميرا الآن/i });
    fireEvent.click(requestBtn);
    expect(onRequest).toHaveBeenCalledTimes(1);

    const guideBtn = screen.getByRole('button', { name: /كيف أفعّل الإذن من المتصفح؟/i });
    fireEvent.click(guideBtn);
    expect(onGuide).toHaveBeenCalledTimes(1);
  });
});
