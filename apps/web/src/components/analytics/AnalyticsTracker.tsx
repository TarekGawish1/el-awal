"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView, isLandingPath, sendPageEngagementPing } from "@/lib/analytics/tracker";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useActivityTracker } from "@/features/analytics/hooks/useActivityTracker";

export function AnalyticsTracker() {
  useActivityTracker();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);
  const user = useAuthStore((s) => s.user);

  // Active page engagement timer refs (tracks exact single-page landing duration)
  const activeSecondsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const currentPathRef = useRef<string>(pathname || "/");

  // Track page view upon navigation
  useEffect(() => {
    if (!pathname) return;

    // Do not track visits of teachers or assistants or admin routes
    if (
      (user?.role as string) === "TEACHER" ||
      (user?.role as string) === "SECRETARIAT" ||
      pathname.startsWith("/teacher") ||
      pathname.startsWith("/secretariat") ||
      pathname.startsWith("/assistant")
    ) {
      return;
    }

    // Flush any pending engagement duration for previous path before resetting
    if (currentPathRef.current && currentPathRef.current !== pathname && activeSecondsRef.current > 0) {
      sendPageEngagementPing(currentPathRef.current, activeSecondsRef.current);
      activeSecondsRef.current = 0;
    }
    currentPathRef.current = pathname;
    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();

    // Compose full relative path with query parameters if present
    const queryString = searchParams?.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;

    // Prevent immediate duplicate fires on re-renders for identical path
    if (lastTrackedPathRef.current === fullPath) {
      return;
    }
    lastTrackedPathRef.current = fullPath;

    // Determine tenant context from authenticated user if available
    const tenantId =
      user?.teacherProfileId ||
      ((user?.role as string) === "TEACHER" ? user?.id : undefined);

    // Fire non-blocking page view telemetry
    trackPageView({
      path: pathname,
      isLandingPage: isLandingPath(pathname),
      tenantId,
      metadata: {
        query: queryString || undefined,
        userRole: user?.role,
      },
    });
  }, [pathname, searchParams, user]);

  // Active engagement loop: accumulates active visibility time and sends low-overhead heartbeats
  useEffect(() => {
    // Exclude teachers and assistants
    if (
      (user?.role as string) === "TEACHER" ||
      (user?.role as string) === "SECRETARIAT" ||
      pathname?.startsWith("/teacher") ||
      pathname?.startsWith("/secretariat") ||
      pathname?.startsWith("/assistant")
    ) {
      return;
    }

    const onUserInteraction = () => {
      lastActivityRef.current = Date.now();
    };

    // Passive interaction listeners (zero impact on scrolling or rendering performance)
    const interactionEvents = ["mousemove", "mousedown", "scroll", "keydown", "touchstart"];
    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, onUserInteraction, { passive: true });
    });

    // 1-second interval to accumulate active time when tab is visible & user is active
    const tickInterval = setInterval(() => {
      if (typeof document === "undefined") return;

      const now = Date.now();
      const elapsedSinceTick = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const isVisible = document.visibilityState === "visible";
      // Idle timeout: stop counting if no interaction for 60s
      const isEngaged = now - lastActivityRef.current < 60 * 1000;

      if (isVisible && isEngaged) {
        activeSecondsRef.current += Math.min(elapsedSinceTick, 5);
      }
    }, 1000);

    // Low-overhead periodic heartbeat ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (activeSecondsRef.current > 0 && currentPathRef.current) {
        sendPageEngagementPing(currentPathRef.current, activeSecondsRef.current);
      }
    }, 30000);

    // Beacon flush on tab hide or exit
    const handleFlush = () => {
      if (activeSecondsRef.current > 0 && currentPathRef.current) {
        sendPageEngagementPing(currentPathRef.current, activeSecondsRef.current);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleFlush();
      } else {
        lastTickRef.current = Date.now();
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", handleFlush);
    window.addEventListener("beforeunload", handleFlush);

    return () => {
      clearInterval(tickInterval);
      clearInterval(pingInterval);
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, onUserInteraction);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", handleFlush);
      window.removeEventListener("beforeunload", handleFlush);
      handleFlush();
    };
  }, [pathname, user]);

  return null;
}

