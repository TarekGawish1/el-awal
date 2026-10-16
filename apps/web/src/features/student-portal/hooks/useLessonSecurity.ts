'use client';

import { useState, useEffect } from 'react';

export function useLessonSecurity() {
  // Tab & Window Focus Obscuring Mask (Screen Sharing / Multi-Window Defense)
  const [isObscured, setIsObscured] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsObscured(true);
      } else {
        setIsObscured(false);
      }
    };

    const handleWindowBlur = () => {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
        return;
      }
      setIsObscured(true);
    };

    const handleWindowFocus = () => {
      if (!document.hidden && document.visibilityState !== 'hidden') {
        setIsObscured(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Keyboard Shortcut & DevTools Suppression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // F12 or PrintScreen
      if (e.key === 'F12' || e.key === 'PrintScreen' || key === 'printscreen' || (e as any).keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + Shift + I / J / C (DevTools)
      if (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (View Source)
      if (isCtrlOrMeta && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + S (Save Page)
      if (isCtrlOrMeta && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Floating Dynamic Anti-Theft Watermark (10% to 85% every 15–25s)
  const [watermarkPos, setWatermarkPos] = useState({ top: 20, left: 20 });
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const shift = () => {
      const newTop = Math.floor(Math.random() * 75) + 10;
      const newLeft = Math.floor(Math.random() * 75) + 10;
      setWatermarkPos({ top: newTop, left: newLeft });
      const delay = Math.floor(Math.random() * 10000) + 15000;
      timeoutId = setTimeout(shift, delay);
    };
    shift();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return {
    isObscured,
    setIsObscured,
    watermarkPos,
  };
}
