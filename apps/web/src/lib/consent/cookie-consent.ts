'use client';

export interface CookieConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export const COOKIE_CONSENT_KEY = 'elawal_cookie_consent_v1';
export const COOKIE_CONSENT_EVENT = 'elawal_cookie_consent_updated';
export const COOKIE_SETTINGS_OPEN_EVENT = 'elawal_open_cookie_settings';
export const CURRENT_CONSENT_VERSION = '1.0.0';

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.essential === true) {
      return parsed as CookieConsentState;
    }
  } catch {
    // In case localStorage is disabled or corrupted
  }
  return null;
}

export function saveConsent(preferences: { analytics: boolean; marketing: boolean }): CookieConsentState {
  const newState: CookieConsentState = {
    essential: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newState));
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: newState }));
    } catch {
      // Ignore storage errors
    }
  }

  return newState;
}

export function hasConsented(category: 'analytics' | 'marketing'): boolean {
  const consent = getStoredConsent();
  if (!consent) return false;
  return Boolean(consent[category]);
}

export function triggerOpenCookieSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_OPEN_EVENT));
  }
}
