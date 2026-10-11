'use client';

/**
 * Scans a QR code from a File or Blob image.
 * Uses native browser BarcodeDetector if available, falling back to barcode-detector ponyfill.
 */
export async function scanQrFromImageFile(file: File | Blob): Promise<string> {
  if (!file) {
    throw new Error('يرجى اختيار ملف صورة صالح.');
  }

  try {
    let DetectorClass: any =
      typeof window !== 'undefined' && (window as any).BarcodeDetector
        ? (window as any).BarcodeDetector
        : null;

    if (!DetectorClass) {
      try {
        // @ts-ignore
        const ponyfill: any = await import('barcode-detector/ponyfill');
        DetectorClass = ponyfill?.BarcodeDetector || ponyfill?.default?.BarcodeDetector;
      } catch (errPony) {
        console.warn('BarcodeDetector ponyfill load failed:', errPony);
      }
    }

    if (!DetectorClass) {
      throw new Error('خاصية مسح الرمز من الصور غير مدعومة في هذا المتصفح. يرجى مسح الرمز عبر الكاميرا المباشرة.');
    }

    const detector = new DetectorClass({ formats: ['qr_code'] });

    let imageSource: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap !== 'undefined') {
      imageSource = await createImageBitmap(file);
    } else {
      imageSource = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(new Error('فشل تحميل الصورة المحددة.'));
        };
        img.src = url;
      });
    }

    const barcodes = await detector.detect(imageSource);

    if (typeof ImageBitmap !== 'undefined' && imageSource instanceof ImageBitmap) {
      imageSource.close();
    }

    if (!barcodes || barcodes.length === 0 || !barcodes[0]?.rawValue) {
      throw new Error('لم يتم العثور على رمز QR واضح في الصورة. يرجى التأكد من وضوح الرمز وإعادة المحاولة.');
    }

    return barcodes[0].rawValue;
  } catch (err: any) {
    if (err?.message && err.message.includes('QR')) {
      throw err;
    }
    throw new Error('تعذر قراءة الرمز من الصورة: ' + (err?.message || 'خطأ غير معروف'));
  }
}
