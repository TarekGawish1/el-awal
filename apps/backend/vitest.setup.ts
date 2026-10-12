import 'reflect-metadata';
import { vi } from 'vitest';

(globalThis as any).jest = vi;
(globalThis as any).jest.setTimeout = (timeout: number) => {
  vi.setConfig({ testTimeout: timeout });
};
