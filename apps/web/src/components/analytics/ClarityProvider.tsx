'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

const DEFAULT_CLARITY_PROJECT_ID = 'yhncqluw0e';

// Env override takes precedence when set to a non-empty value; otherwise the
// hardcoded project ID guarantees Clarity.init() never receives undefined.
const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ||
  DEFAULT_CLARITY_PROJECT_ID;

// Module-level flag prevents double init under React StrictMode / re-mounts.
let hasInitialized = false;

export function ClarityProvider() {
  useEffect(() => {
    // useEffect only runs on the client, so Clarity.init() never runs during SSR.
    if (typeof window === 'undefined') return;
    if (hasInitialized) return;
    if (!CLARITY_PROJECT_ID) return;

    try {
      Clarity.init(CLARITY_PROJECT_ID);
      hasInitialized = true;
    } catch {
      // Analytics must never break the app.
    }
  }, []);

  return null;
}
