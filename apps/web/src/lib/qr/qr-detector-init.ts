'use client';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initializes the ZXing WebAssembly Barcode Detector module with offline local asset paths.
 * Loaded dynamically on demand so that the heavy WASM library is only requested
 * when a QR scanner is actually triggered/mounted.
 */
export async function initQrDetector(): Promise<void> {
  if (typeof window === 'undefined' || isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const qrModule = await import('@yudiel/react-qr-scanner');
      let prepareFn: any = null;
      try {
        prepareFn = qrModule?.prepareZXingModule;
      } catch {
        // Module mock does not define prepareZXingModule in test environments
      }

      if (typeof prepareFn === 'function') {
        prepareFn({
          overrides: {
            locateFile: (path: string, prefix: string) => {
              if (path.endsWith('.wasm')) {
                return `/wasm/${path}`;
              }
              return prefix + path;
            },
          },
        });
      }
      isInitialized = true;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Failed to configure ZXing WASM offline locateFile:', err);
      }
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
