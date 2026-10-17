'use client';

import React from 'react';
import { DashboardLayoutShell } from '@/components/layout/DashboardLayoutShell';

/**
 * Dashboard root layout wrapper (< 60 lines).
 * Responsiveness & safe-area classes preserved in shell:
 * - Header: pt-[env(safe-area-inset-top,0px)]
 * - Main: pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]
 * - Layout: min-h-screen overflow-x-hidden
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
