'use client';

import { prepareZXingModule } from '@yudiel/react-qr-scanner';

let isInitialized = false;

/**
 * Initializes the ZXing WebAssembly Barcode Detector module with offline local asset paths.
 * Ensures scanning works seamlessly without needing internet access or Google Play Services.
 */
export function initQrDetector() {
  if (typeof window === 'undefined' || isInitialized) return;

  try {
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
    isInitialized = true;
  } catch (err) {
    console.warn('Failed to configure ZXing WASM offline locateFile:', err);
  }
}

// Auto-run in browser context on module load
if (typeof window !== 'undefined') {
  initQrDetector();
}
