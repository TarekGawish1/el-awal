import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredConsent,
  saveConsent,
  hasConsented,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
} from '../cookie-consent';

describe('Cookie Consent Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns null when no consent has been stored', () => {
    expect(getStoredConsent()).toBeNull();
    expect(hasConsented('analytics')).toBe(false);
    expect(hasConsented('marketing')).toBe(false);
  });

  it('saves consent preferences and dispatches event', () => {
    const listener = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, listener);

    const saved = saveConsent({ analytics: true, marketing: false });

    expect(saved.essential).toBe(true);
    expect(saved.analytics).toBe(true);
    expect(saved.marketing).toBe(false);
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('"analytics":true');
    expect(hasConsented('analytics')).toBe(true);
    expect(hasConsented('marketing')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener);
  });

  it('correctly updates consent when user rejects analytics', () => {
    saveConsent({ analytics: true, marketing: true });
    expect(hasConsented('analytics')).toBe(true);

    saveConsent({ analytics: false, marketing: false });
    expect(hasConsented('analytics')).toBe(false);
    expect(hasConsented('marketing')).toBe(false);
  });
});
