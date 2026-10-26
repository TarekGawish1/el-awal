import { describe, it, expect, vi } from 'vitest';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  it('generates a new UUID when x-correlation-id header is missing', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: vi.fn() };
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBeDefined();
    expect(req.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.headers['x-correlation-id']);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves valid alphanumeric correlation IDs', () => {
    const validId = 'req_abc-123_XYZ-999';
    const req: any = { headers: { 'x-correlation-id': validId } };
    const res: any = { setHeader: vi.fn() };
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBe(validId);
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', validId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces malicious or invalid correlation IDs with a new safe UUID', () => {
    const maliciousInputs = [
      'short', // < 8 chars
      'invalid!char$with#symbols',
      'id_with_newline\r\nInjected-Header: value',
      'a'.repeat(65), // > 64 chars
    ];

    for (const badId of maliciousInputs) {
      const req: any = { headers: { 'x-correlation-id': badId } };
      const res: any = { setHeader: vi.fn() };
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(req.headers['x-correlation-id']).not.toBe(badId);
      expect(req.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.headers['x-correlation-id']);
      expect(next).toHaveBeenCalledTimes(1);
    }
  });
});
