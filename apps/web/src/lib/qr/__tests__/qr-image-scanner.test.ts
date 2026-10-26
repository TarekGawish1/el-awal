import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanQrFromImageFile } from '../qr-image-scanner';

describe('scanQrFromImageFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when file is missing', async () => {
    await expect(scanQrFromImageFile(null as any)).rejects.toThrow('يرجى اختيار ملف صورة صالح.');
  });

  it('detects barcode when BarcodeDetector returns codes', async () => {
    const mockDetect = vi.fn().mockResolvedValue([{ rawValue: 'ELAWAL:STD:123:SEC:abc' }]);
    (window as any).BarcodeDetector = vi.fn().mockImplementation(function (this: any) {
      this.detect = mockDetect;
    });

    (window as any).createImageBitmap = vi.fn().mockResolvedValue({
      close: vi.fn(),
    });

    const file = new File(['dummy'], 'qr.png', { type: 'image/png' });
    const result = await scanQrFromImageFile(file);

    expect(result).toBe('ELAWAL:STD:123:SEC:abc');
    expect(mockDetect).toHaveBeenCalled();
  });

  it('throws helpful Arabic error when no barcode is detected', async () => {
    const mockDetect = vi.fn().mockResolvedValue([]);
    (window as any).BarcodeDetector = vi.fn().mockImplementation(function (this: any) {
      this.detect = mockDetect;
    });

    (window as any).createImageBitmap = vi.fn().mockResolvedValue({
      close: vi.fn(),
    });

    const file = new File(['dummy'], 'blank.png', { type: 'image/png' });
    await expect(scanQrFromImageFile(file)).rejects.toThrow('لم يتم العثور على رمز QR واضح');
  });
});
