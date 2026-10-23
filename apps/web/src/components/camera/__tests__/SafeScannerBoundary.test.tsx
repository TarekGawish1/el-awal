import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { SafeScannerBoundary } from '../SafeScannerBoundary';

// Component that throws on render
function ThrowingComponent({ shouldThrow, errorMessage }: { shouldThrow: boolean; errorMessage: string }) {
  if (shouldThrow) {
    const error = new Error(errorMessage);
    if (errorMessage.includes('ChunkLoadError') || errorMessage.includes('Loading chunk')) {
      error.name = 'ChunkLoadError';
    }
    throw error;
  }
  return <div data-testid="healthy-scanner">Scanner is active</div>;
}

describe('SafeScannerBoundary Component', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('renders children normally when there is no error', () => {
    render(
      <SafeScannerBoundary>
        <ThrowingComponent shouldThrow={false} errorMessage="" />
      </SafeScannerBoundary>
    );

    expect(screen.getByTestId('healthy-scanner')).toBeInTheDocument();
  });

  it('catches ChunkLoadError and renders offline friendly fallback without crashing', () => {
    render(
      <SafeScannerBoundary>
        <ThrowingComponent shouldThrow={true} errorMessage="Loading chunk 123 failed." />
      </SafeScannerBoundary>
    );

    expect(screen.getByText('تعذر تشغيل الماسح في وضع عدم الاتصال')).toBeInTheDocument();
    expect(
      screen.getByText(/يمكنك التبديل إلى الرصد اليدوي لتسجيل البيانات محلياً بدون إنترنت/i)
    ).toBeInTheDocument();
  });

  it('provides retry and manual switch actions in the fallback UI', () => {
    const onRetry = vi.fn();
    const onSwitchToManual = vi.fn();
    const onPickImage = vi.fn();

    render(
      <SafeScannerBoundary
        onRetry={onRetry}
        onSwitchToManual={onSwitchToManual}
        onPickImage={onPickImage}
      >
        <ThrowingComponent shouldThrow={true} errorMessage="Camera hardware failed." />
      </SafeScannerBoundary>
    );

    expect(screen.getByText('حدث خطأ أثناء تشغيل كاميرا الماسح')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /إعادة المحاولة/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    const manualBtn = screen.getByRole('button', { name: /الرصد اليدوي/i });
    fireEvent.click(manualBtn);
    expect(onSwitchToManual).toHaveBeenCalledTimes(1);

    const pickImgBtn = screen.getByRole('button', { name: /مسح من صورة/i });
    fireEvent.click(pickImgBtn);
    expect(onPickImage).toHaveBeenCalledTimes(1);
  });
});
