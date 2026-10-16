'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import { hasConsented, COOKIE_CONSENT_EVENT, CookieConsentState } from '@/lib/consent/cookie-consent';

const DEFAULT_CLARITY_PROJECT_ID = 'yhncqluw0e';

// Env override takes precedence when set to a non-empty value; otherwise the
// hardcoded project ID guarantees Clarity.init() never receives undefined.
const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ||
  DEFAULT_CLARITY_PROJECT_ID;

// Module-level flag prevents double init under React StrictMode / re-mounts.
let hasInitialized = false;

function initClaritySafely() {
  if (typeof window === 'undefined') return;
  if (hasInitialized) return;
  if (!CLARITY_PROJECT_ID) return;

  // GDPR/ePrivacy Compliance: verify user gave consent for analytics
  if (!hasConsented('analytics')) {
    return;
  }

  try {
    Clarity.init(CLARITY_PROJECT_ID);
    hasInitialized = true;
  } catch {
    // Analytics must never break the app.
  }
}

export function ClarityProvider() {
  useEffect(() => {
    // Check and init if consent already exists, deferred to idle time to protect initial paint
    const initDeferred = () => {
      initClaritySafely();
    };

    let idleId: any;
    let timerId: any;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(initDeferred, { timeout: 4000 });
    } else {
      timerId = setTimeout(initDeferred, 2500);
    }

    // Listen for consent changes when user interacts with CookieConsentBanner
    const handleConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsentState>;
      if (customEvent.detail?.analytics) {
        initClaritySafely();
      }
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentUpdate);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentUpdate);
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  return null;
}
