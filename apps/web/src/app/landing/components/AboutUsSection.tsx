'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const ABOUT_IMAGE_COUNT = 32;
const ABOUT_IMAGE_DURATION_MS = 3500;
const ABOUT_IMAGE_BASE_URL = "/about-us";

// In-memory cache of loaded frames across component re-renders
const loadedImageCache = new Map<number, HTMLImageElement>();
const inFlightRequests = new Map<number, Promise<HTMLImageElement | null>>();

function loadSingleAboutImage(index: number): Promise<HTMLImageElement | null> {
  if (loadedImageCache.has(index)) {
    return Promise.resolve(loadedImageCache.get(index)!);
  }
  if (inFlightRequests.has(index)) {
    return inFlightRequests.get(index)!;
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    if (index > 0) (image as any).fetchPriority = "low";
    image.onload = () => {
      loadedImageCache.set(index, image);
      inFlightRequests.delete(index);
      resolve(image);
    };
    image.onerror = () => {
      inFlightRequests.delete(index);
      resolve(null);
    };
    image.src = `${ABOUT_IMAGE_BASE_URL}/${index + 1}.webp`;
  });

  inFlightRequests.set(index, promise);
  return promise;
}

function checkIsStaticOnly(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
  } catch {}
  try {
    const nav = navigator as any;
    if (nav?.connection?.saveData === true) {
      return true;
    }
  } catch {}
  return false;
}

function AboutBackgroundSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasImages, setHasImages] = useState(false);

  useEffect(() => {
    let isActive = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let isVisible = false;
    let isBooted = false;
    let isStaticOnly = checkIsStaticOnly();
    let currentImageIndex = 0;
    let currentImage: HTMLImageElement | null = loadedImageCache.get(0) || null;

    // Use a soft cover layer to fill the section, then show the complete frame
    // on top so tall phone layouts do not make the subject look zoomed in.
    const drawCurrentImage = () => {
      const canvas = canvasRef.current;
      const image = currentImage;
      if (!canvas || !image) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
      const targetHeight = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const coverScale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      context.clearRect(0, 0, canvas.width, canvas.height);

      const coverWidth = image.naturalWidth * coverScale;
      const coverHeight = image.naturalHeight * coverScale;
      context.save();
      context.globalAlpha = 0.35;
      context.filter = "blur(18px)";
      context.drawImage(
        image,
        (canvas.width - coverWidth) / 2,
        (canvas.height - coverHeight) / 2,
        coverWidth,
        coverHeight,
      );
      context.restore();

      const containScale = Math.min(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      const containWidth = image.naturalWidth * containScale;
      const containHeight = image.naturalHeight * containScale;
      context.drawImage(
        image,
        (canvas.width - containWidth) / 2,
        (canvas.height - containHeight) / 2,
        containWidth,
        containHeight,
      );
    };

    const clearSlideshowTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    // Forward preloader: ensure next frame is requested progressive/JIT
    const prepareNextFrame = (nextIndex: number) => {
      if (isStaticOnly) return;
      loadSingleAboutImage(nextIndex);
    };

    const scheduleNextSlide = () => {
      clearSlideshowTimer();
      if (!isActive || !isVisible || isStaticOnly) return;

      const nextIndex = (currentImageIndex + 1) % ABOUT_IMAGE_COUNT;
      // Preload next frame right away so it has 3500ms to download
      prepareNextFrame(nextIndex);

      timerId = setTimeout(() => {
        if (!isActive || !isVisible || isStaticOnly) return;
        advanceToNextSlide(nextIndex);
      }, ABOUT_IMAGE_DURATION_MS);
    };

    const advanceToNextSlide = (targetIndex: number) => {
      const cached = loadedImageCache.get(targetIndex);
      if (cached) {
        currentImageIndex = targetIndex;
        currentImage = cached;
        drawCurrentImage();
        scheduleNextSlide();
      } else {
        // Late frame: await in-flight load while keeping current frame visible on canvas
        loadSingleAboutImage(targetIndex).then((loaded) => {
          if (!isActive || !isVisible || isStaticOnly) return;
          if (loaded) {
            currentImageIndex = targetIndex;
            currentImage = loaded;
            drawCurrentImage();
          } else {
            // If failed to load, skip to subsequent index
            currentImageIndex = (targetIndex + 1) % ABOUT_IMAGE_COUNT;
          }
          scheduleNextSlide();
        });
      }
    };

    const boot = () => {
      if (isBooted) return;
      isBooted = true;

      // Load initial frame 0 (1.webp)
      loadSingleAboutImage(0).then((firstImg) => {
        if (!isActive) return;
        if (firstImg) {
          currentImage = firstImg;
          setHasImages(true);
          drawCurrentImage();

          if (canvasRef.current && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(drawCurrentImage);
            resizeObserver.observe(canvasRef.current);
          }

          if (isVisible && !isStaticOnly) {
            scheduleNextSlide();
          }
        }
      });
    };

    // Handle visibility changes from IntersectionObserver
    const handleVisibilityChange = (intersecting: boolean) => {
      isVisible = intersecting;
      if (intersecting) {
        if (!isBooted) {
          boot();
        } else {
          // If already booted, redraw current image in case size changed while offscreen
          drawCurrentImage();
          if (!isStaticOnly) {
            scheduleNextSlide();
          }
        }
      } else {
        // Left the viewport: pause slideshow and clear timer
        clearSlideshowTimer();
      }
    };

    // Setup IntersectionObserver with 200px rootMargin
    const canvasEl = canvasRef.current;
    if (canvasEl && typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const intersecting = entries.some((e) => e.isIntersecting);
          handleVisibilityChange(intersecting);
        },
        { rootMargin: "200px" },
      );
      intersectionObserver.observe(canvasEl);
    } else {
      isVisible = true;
      boot();
    }

    // Dynamic preference listener: prefers-reduced-motion
    let motionMediaQuery: MediaQueryList | null = null;
    const handleMotionChange = () => {
      const newStatic = checkIsStaticOnly();
      if (newStatic === isStaticOnly) return;
      isStaticOnly = newStatic;
      if (isStaticOnly) {
        clearSlideshowTimer();
      } else if (isVisible && isBooted) {
        scheduleNextSlide();
      }
    };

    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (motionMediaQuery.addEventListener) {
          motionMediaQuery.addEventListener("change", handleMotionChange);
        } else if ((motionMediaQuery as any).addListener) {
          (motionMediaQuery as any).addListener(handleMotionChange);
        }
      } catch {}
    }

    // Dynamic preference listener: navigator.connection.saveData
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    const handleConnectionChange = () => {
      const newStatic = checkIsStaticOnly();
      if (newStatic === isStaticOnly) return;
      isStaticOnly = newStatic;
      if (isStaticOnly) {
        clearSlideshowTimer();
      } else if (isVisible && isBooted) {
        scheduleNextSlide();
      }
    };

    if (nav?.connection?.addEventListener) {
      try {
        nav.connection.addEventListener("change", handleConnectionChange);
      } catch {}
    }

    return () => {
      isActive = false;
      clearSlideshowTimer();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      if (motionMediaQuery) {
        if (motionMediaQuery.removeEventListener) {
          motionMediaQuery.removeEventListener("change", handleMotionChange);
        } else if ((motionMediaQuery as any).removeListener) {
          (motionMediaQuery as any).removeListener(handleMotionChange);
        }
      }
      if (nav?.connection?.removeEventListener) {
        try {
          nav.connection.removeEventListener("change", handleConnectionChange);
        } catch {}
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden">
      {/* Always-on premium gradient fallback — visible instantly while local images load */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"
        aria-hidden="true"
      />
      <div
        className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className={`block w-full h-full absolute inset-0 transition-opacity duration-1000 ${hasImages ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-900/50" />
    </div>
  );
}

export function AboutUsSection() {
  return (
    <section
      className="pt-16 sm:pt-24 relative overflow-hidden flex flex-col min-h-[85vh] sm:min-h-[80vh]"
      id="about"
      dir="rtl"
    >
      <AboutBackgroundSequence />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 w-full flex flex-col flex-1 justify-between h-full">
        {/* Wrapper to align content to the right on desktop */}
        <div className="w-full lg:w-[60%] xl:w-[55%] mr-0 ml-auto flex flex-col flex-1 justify-between h-full">
          {/* Top Feature Cards */}
          <div className="w-full max-w-4xl mx-auto mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-3 gap-3 sm:gap-6"
            >
              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="text-3xl sm:text-5xl font-black text-blue-400 mb-2 sm:mb-4">
                  +25
                </div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">
                  سنوات خبرة
                </div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">
                  في تدريس الرياضيات
                </p>
              </div>

              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 sm:mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-8 sm:w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">
                  شرح مبسط
                </div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">
                  نركز على استيعاب كل فكرة.
                </p>
              </div>

              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 sm:mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-8 sm:w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">
                  تدريبات مكثفة
                </div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">
                  مئات الأسئلة المحلولة.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Text Card */}
          <div className="w-full mt-auto -mb-8 sm:-mb-12">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 border-b-0 p-6 sm:p-8 md:p-10 pb-10 sm:pb-12 md:pb-16 rounded-t-[2rem] sm:rounded-t-[3rem] shadow-2xl text-center text-white"
            >
              <div className="inline-block px-3 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-full font-bold text-xs sm:text-sm mb-3 sm:mb-5 text-white border border-white/30">
                من نحن
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-5 leading-tight">
                تعرف على الأستاذ /{" "}
                <span className="text-blue-400">أحمد غريب</span>
              </h2>

              <div className="space-y-3 sm:space-y-4 text-slate-200 text-[13px] sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                <p>
                  نحن في منصة الأول نؤمن بأن الرياضيات ليست مجرد أرقام وقوانين،
                  بل هي لغة العقل ومنهج للتفكير. هدفنا هو تبسيط المادة وتوصيلها
                  للطلاب بأسهل وأمتع الطرق الممكنة.
                </p>
                <p>
                  الأستاذ <strong className="text-white">أحمد غريب</strong>،
                  خبير تدريس الرياضيات للمراحل الإعدادية والثانوية، يمتلك خبرة
                  واسعة في تأهيل الطلاب للتعامل مع النظام الحديث للامتحانات بثقة
                  واقتدار، من خلال التركيز على الفهم العميق والتدريب المستمر.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}