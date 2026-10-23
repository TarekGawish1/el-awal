'use client';

import { prepareZXingModule } from '@yudiel/react-qr-scanner';

let isInitialized = false;

/**
 * Initializes the ZXing WebAssembly Barcode Detector module with offline local asset paths.
 * Configures the locateFile override so that the ZXing WASM module points directly
 * to the precached `/wasm/zxing_reader.wasm` in offline mode.
 */
export async function initQrDetector(): Promise<void> {
  if (typeof window === 'undefined' || isInitialized) return;

  try {
    if (typeof prepareZXingModule === 'function') {
      prepareZXingModule({
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
  }
}
