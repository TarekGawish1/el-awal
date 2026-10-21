'use client';

import React, { useEffect, useRef } from 'react';

const HERO_FRAME_COUNT = 22;
const HERO_FRAME_DURATION_MS = 150;

let cachedHeroFrames: HTMLImageElement[] | null = null;
let cachedFrame0: HTMLImageElement | null = null;
let heroFramesLoadPromise: Promise<HTMLImageElement[]> | null = null;

function checkPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

function checkSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  try {
    return !!(navigator as any).connection?.saveData;
  } catch {
    return false;
  }
}

function loadSingleHeroFrame(index: number): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const image = new Image();
    image.decoding = 'async';
    // Decorative frames must never compete with LCP or critical page assets
    (image as any).fetchPriority = 'low';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `/hero-animation/frame_${String(index).padStart(6, '0')}.webp`;
  });
}

function loadInitialStaticFrame(): Promise<HTMLImageElement | null> {
  if (cachedFrame0) return Promise.resolve(cachedFrame0);
  if (cachedHeroFrames && cachedHeroFrames[0]) return Promise.resolve(cachedHeroFrames[0]);

  return loadSingleHeroFrame(0).then((frame) => {
    if (frame) {
      cachedFrame0 = frame;
    }
    return frame;
  });
}

function loadRemainingHeroFrames(frame0: HTMLImageElement | null): Promise<HTMLImageElement[]> {
  if (cachedHeroFrames) return Promise.resolve(cachedHeroFrames);
  if (heroFramesLoadPromise) return heroFramesLoadPromise;

  const CONCURRENCY = 3;
  heroFramesLoadPromise = (async () => {
    const remainingIndices = Array.from({ length: HERO_FRAME_COUNT - 1 }, (_, i) => i + 1);
    const loadedRemaining: (HTMLImageElement | null)[] = [];

    for (let start = 0; start < remainingIndices.length; start += CONCURRENCY) {
      const batch = remainingIndices.slice(start, start + CONCURRENCY);
      const batchResults = await Promise.all(batch.map((idx) => loadSingleHeroFrame(idx)));
      loadedRemaining.push(...batchResults);
    }

    const validRemaining = loadedRemaining.filter((f): f is HTMLImageElement => f !== null);
    const allFrames = frame0 ? [frame0, ...validRemaining] : validRemaining;
    cachedHeroFrames = allFrames;
    return allFrames;
  })();

  return heroFramesLoadPromise;
}

export function HeroImageSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isActive = true;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let idleCallbackId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let currentFrameIndex = 0;
    let lastFrameTime = 0;
    let frames: HTMLImageElement[] = cachedHeroFrames || [];
    let isVisible = true;

    // Check user accessibility & connection preferences
    const reducedMotion = checkPrefersReducedMotion();
    const saveData = checkSaveDataEnabled();

    // If user requested Data Saver, do not download any decorative animation frames
    if (saveData) {
      return;
    }

    const drawFrame = (targetImage?: HTMLImageElement) => {
      const canvas = canvasRef.current;
      const image = targetImage || frames[currentFrameIndex];
      if (!canvas || !image) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
      const targetHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    };

    const animate = (timestamp: number) => {
      if (!isActive || !isVisible || frames.length <= 1) return;
      if (timestamp - lastFrameTime >= HERO_FRAME_DURATION_MS) {
        currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        lastFrameTime = timestamp;
        drawFrame();
      }
      animationFrameId = window.requestAnimationFrame(animate);
    };

    // If all frames were already loaded and cached on a previous page visit:
    if (frames.length > 1) {
      drawFrame();
      if (!reducedMotion) {
        lastFrameTime = performance.now();
        animationFrameId = window.requestAnimationFrame(animate);
      }
      if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => drawFrame());
        resizeObserver.observe(canvasRef.current);
      }
      return () => {
        isActive = false;
        resizeObserver?.disconnect();
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      };
    }

    // Step 1: Provide static visual fallback with frame 0
    let staticFrame: HTMLImageElement | null = null;

    loadInitialStaticFrame().then((frame) => {
      if (!isActive || !frame) return;
      staticFrame = frame;
      frames = [frame];
      drawFrame(frame);

      if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => drawFrame());
        resizeObserver.observe(canvasRef.current);
      }

      // If user prefers reduced motion, we stop here (static visual displayed, 0 animation frames fetched)
      if (reducedMotion) {
        return;
      }

      // Step 2: Defer frames 1..21 until after page is fully loaded and idle
      const startDeferredSequence = () => {
        if (!isActive || !isVisible) return;
        loadRemainingHeroFrames(staticFrame).then((allFrames) => {
          if (!isActive || allFrames.length <= 1) return;
          frames = allFrames;
          lastFrameTime = performance.now();
          if (isVisible && animationFrameId === null) {
            animationFrameId = window.requestAnimationFrame(animate);
          }
        });
      };

      const scheduleIdle = () => {
        if (!isActive) return;
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          idleCallbackId = (window as any).requestIdleCallback(startDeferredSequence, { timeout: 5000 });
        } else {
          timeoutId = setTimeout(startDeferredSequence, 2500);
        }
      };

      // Add a deliberate 2.5s post-load deferral window so initial hydration and fonts are 100% idle
      if (typeof document !== 'undefined' && document.readyState === 'complete') {
        timeoutId = setTimeout(scheduleIdle, 2500);
      } else if (typeof window !== 'undefined') {
        const onLoad = () => {
          window.removeEventListener('load', onLoad);
          timeoutId = setTimeout(scheduleIdle, 2500);
        };
        window.addEventListener('load', onLoad, { once: true });
      }
    });

    // Pause animation when the hero canvas scrolls out of the viewport
    if (typeof IntersectionObserver !== 'undefined' && canvasRef.current) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible && frames.length > 1 && !reducedMotion && animationFrameId === null) {
            lastFrameTime = performance.now();
            animationFrameId = window.requestAnimationFrame(animate);
          } else if (!isVisible && animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(canvasRef.current);
    }

    return () => {
      isActive = false;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (idleCallbackId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-10"
        aria-hidden="true"
      />
    </div>
  );
}
