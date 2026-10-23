'use client';

import React, { useEffect, useRef } from 'react';

const HERO_FRAME_COUNT = 22;
const HERO_FRAME_DURATION_MS = 110; // ~9-10 fps for smooth, organic floating math animation

let cachedHeroFrames: HTMLImageElement[] | null = null;
let cachedFrame0: HTMLImageElement | null = null;
let heroFramesLoadPromise: Promise<HTMLImageElement[]> | null = null;

function loadSingleHeroFrame(index: number): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const image = new Image();
    image.decoding = 'async';
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
  if (cachedHeroFrames && cachedHeroFrames.length > 1) return Promise.resolve(cachedHeroFrames);
  if (heroFramesLoadPromise) return heroFramesLoadPromise;

  heroFramesLoadPromise = (async () => {
    const remainingIndices = Array.from({ length: HERO_FRAME_COUNT - 1 }, (_, i) => i + 1);
    const loadedRemaining = await Promise.all(
      remainingIndices.map((idx) => loadSingleHeroFrame(idx))
    );

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
    let currentFrameIndex = 0;
    let lastFrameTime = 0;
    let frames: HTMLImageElement[] = cachedHeroFrames || [];
    let isVisible = true;

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

    // If frames were already cached from a previous mount:
    if (frames.length > 1) {
      drawFrame();
      lastFrameTime = performance.now();
      animationFrameId = window.requestAnimationFrame(animate);

      if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => drawFrame());
        resizeObserver.observe(canvasRef.current);
      }
    } else {
      // Step 1: Immediately load and draw frame 0
      loadInitialStaticFrame().then((frame) => {
        if (!isActive || !frame) return;
        frames = [frame];
        drawFrame(frame);

        if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => drawFrame());
          resizeObserver.observe(canvasRef.current);
        }

        // Step 2: Immediately load remaining frames in parallel and start animating
        loadRemainingHeroFrames(frame).then((allFrames) => {
          if (!isActive || allFrames.length <= 1) return;
          frames = allFrames;
          lastFrameTime = performance.now();
          if (isVisible && animationFrameId === null) {
            animationFrameId = window.requestAnimationFrame(animate);
          }
        });
      });
    }

    // Pause animation when the hero canvas scrolls out of viewport for battery efficiency
    if (typeof IntersectionObserver !== 'undefined' && canvasRef.current) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible && frames.length > 1 && animationFrameId === null) {
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
