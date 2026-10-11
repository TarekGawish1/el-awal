declare module 'barcode-detector/ponyfill' {
  export class BarcodeDetector {
    constructor(options?: { formats?: string[] });
    detect(image: any): Promise<Array<{ rawValue: string; format: string }>>;
    static getSupportedFormats(): Promise<string[]>;
  }
  export function prepareZXingModule(options?: any): void;
  export function setZXingModuleOverrides(options?: any): void;
}
