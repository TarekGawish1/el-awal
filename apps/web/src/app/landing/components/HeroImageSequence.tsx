'use client';

import React, { useEffect, useRef } from 'react';

const HERO_FRAME_COUNT = 22;
const HERO_FRAME_DURATION_MS = 150;
let cachedHeroFrames: HTMLImageElement[] | null = null;
let heroFramesLoadPromise: Promise<HTMLImageElement[]> | null = null;

function loadSingleHeroFrame(index: number): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    // Decorative frames must never out-prioritize LCP
    (image as any).fetchPriority = 'low';
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      resolve(null);
    };
    image.src = `/hero-animation/frame_${String(index).padStart(6, '0')}.webp`;
  });
}

function loadHeroFramesOnce(): Promise<HTMLImageElement[]> {
  if (cachedHeroFrames) return Promise.resolve(cachedHeroFrames);
  if (heroFramesLoadPromise) return heroFramesLoadPromise;

  // Load in small batches (concurrency 3) instead of 22 parallel requests,
  // so the animation never saturates bandwidth needed by critical resources.
  const CONCURRENCY = 3;
  heroFramesLoadPromise = (async () => {
    const results: (HTMLImageElement | null)[] = new Array(
      HERO_FRAME_COUNT,
    ).fill(null);
    for (let start = 0; start < HERO_FRAME_COUNT; start += CONCURRENCY) {
      const batch = Array.from(
        { length: Math.min(CONCURRENCY, HERO_FRAME_COUNT - start) },
        (_, offset) => start + offset,
      );
      const loaded = await Promise.all(
        batch.map((index) => loadSingleHeroFrame(index)),
      );
      loaded.forEach((image, offset) => {
        results[start + offset] = image;
      });
    }
    cachedHeroFrames = results.filter(
      (frame): frame is HTMLImageElement => frame !== null,
    );
    return cachedHeroFrames;
  })();

  return heroFramesLoadPromise;
}

export function HeroImageSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isActive = true;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let currentFrameIndex = 0;
    let lastFrameTime = 0;
    let frames: HTMLImageElement[] = [];

    const drawFrame = () => {
      const canvas = canvasRef.current;
      const image = frames[currentFrameIndex];
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
      if (!isActive) return;
      if (timestamp - lastFrameTime >= HERO_FRAME_DURATION_MS) {
        currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        lastFrameTime = timestamp;
        drawFrame();
      }
      animationFrameId = window.requestAnimationFrame(animate);
    };

    // Defer decorative hero frames until AFTER the page is fully loaded
    const startLoading = () => {
      const run = () => {
        if (!isActive) return;
        loadHeroFramesOnce().then((loadedFrames) => {
          if (!isActive) return;
          frames = loadedFrames;
          if (frames.length === 0) return;

          drawFrame();
          lastFrameTime = performance.now();
          if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(drawFrame);
            resizeObserver.observe(canvasRef.current);
          }
          animationFrameId = window.requestAnimationFrame(animate);
        });
      };
      const scheduleIdle = () => {
        if (!isActive) return;
        if (
          typeof window !== 'undefined' &&
          'requestIdleCallback' in (window as any)
        ) {
          (window as any).requestIdleCallback(run, { timeout: 5000 });
        } else {
          setTimeout(run, 2500);
        }
      };
      if (
        typeof document !== 'undefined' &&
        document.readyState === 'complete'
      ) {
        scheduleIdle();
      } else if (typeof window !== 'undefined') {
        let loadFired = false;
        const onLoad = () => {
          loadFired = true;
          window.removeEventListener('load', onLoad);
          scheduleIdle();
        };
        window.addEventListener('load', onLoad, { once: true });
        setTimeout(() => {
          if (!loadFired && isActive) {
            window.removeEventListener('load', onLoad);
            scheduleIdle();
          }
        }, 6000);
      } else {
        setTimeout(run, 2500);
      }
    };

    startLoading();

    return () => {
      isActive = false;
      resizeObserver?.disconnect();
      if (animationFrameId !== null)
        window.cancelAnimationFrame(animationFrameId);
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
