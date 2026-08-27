import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Import viewport from layout
import { viewport } from '@/app/layout';
import { Input } from '@/components/ui/Input';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

describe('PWA, Viewport & Mobile Responsiveness Audit', () => {
  describe('1. PWA Manifest & Viewport Configuration', () => {
    it('verifies manifest.json exists and contains correct PWA settings', () => {
      const manifestPath = resolve(process.cwd(), 'public/manifest.json');
      expect(existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(manifestContent.display).toBe('standalone');
      expect(manifestContent.orientation).toBe('portrait');
      expect(manifestContent.background_color).toBe('#f8fafc');
      expect(manifestContent.theme_color).toBe('#1e40af');
      expect(manifestContent.start_url).toBe('/login');
      expect(manifestContent.scope).toBe('/');
    });

    it('verifies manifest.webmanifest exists and matches PWA settings', () => {
      const manifestPath = resolve(process.cwd(), 'public/manifest.webmanifest');
      expect(existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(manifestContent.display).toBe('standalone');
      expect(manifestContent.orientation).toBe('portrait');
      expect(manifestContent.theme_color).toBe('#1e40af');
    });

    it('verifies layout.tsx exports viewport with viewportFit cover and themeColor', () => {
      expect(viewport).toBeDefined();
      expect(viewport.viewportFit).toBe('cover');
      expect(viewport.themeColor).toBe('#1e40af');
      expect(viewport.userScalable).toBe(false);
      expect(viewport.width).toBe('device-width');
    });
  });

  describe('2. Standalone Safe Area Inset Calculations', () => {
    it('verifies DashboardLayout source includes safe-area-inset in header and main content', () => {
      const layoutSource = readFileSync(
        resolve(process.cwd(), 'src/app/(dashboard)/layout.tsx'),
        'utf-8'
      );
      // Header safe area inset
      expect(layoutSource).toContain('pt-[env(safe-area-inset-top,0px)]');
      // Main content safe area inset and mobile padding
      expect(layoutSource).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]');
      expect(layoutSource).toContain('min-h-screen');
      expect(layoutSource).toContain('overflow-x-hidden');
    });

    it('verifies MobileBottomNav source includes safe-area-inset-bottom and height calculation', () => {
      const navSource = readFileSync(
        resolve(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx'),
        'utf-8'
      );
      expect(navSource).toContain('pb-[env(safe-area-inset-bottom,0px)]');
      expect(navSource).toContain('h-[calc(4rem+env(safe-area-inset-bottom,0px))]');
      expect(navSource).toContain('fixed bottom-0 inset-x-0');
    });
  });

  describe('3. PWA In-App Install Prompt Banner', () => {
    it('verifies PwaInstallPrompt source pins above bottom navigation with safe-area spacing', () => {
      const promptSource = readFileSync(
        resolve(process.cwd(), 'src/components/pwa/PwaInstallPrompt.tsx'),
        'utf-8'
      );
      expect(promptSource).toContain('bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]');
      expect(promptSource).toContain('min-h-[44px]');
    });
  });

  describe('4. Touch Gestures & Overscroll Behaviors', () => {
    it('verifies globals.css includes overscroll and selection rules', () => {
      const cssSource = readFileSync(
        resolve(process.cwd(), 'src/app/globals.css'),
        'utf-8'
      );
      expect(cssSource).toContain('overscroll-behavior-y: none');
      expect(cssSource).toContain('-webkit-tap-highlight-color: transparent');
      expect(cssSource).toContain('touch-action: manipulation');
      expect(cssSource).toContain('user-select: none');
    });
  });

  describe('5. Mobile Modals & Bottom Sheet Transitions', () => {
    it('renders Input with min-h-[46px] and text-base font size on mobile to prevent Safari auto-zoom', () => {
      render(<Input placeholder="اختبار رقم الهاتف" label="رقم الهاتف" />);
      const input = screen.getByPlaceholderText('اختبار رقم الهاتف');
      expect(input.className).toContain('min-h-[46px]');
      expect(input.className).toContain('text-base');
    });

    it('renders ConfirmModal with bottom-sheet classes on mobile and centered on desktop', () => {
      render(
        <ConfirmModal
          isOpen={true}
          title="تأكيد الحذف"
          message="هل أنت متأكد من الحذف؟"
          onConfirm={() => {}}
          onClose={() => {}}
        />
      );

      const title = screen.getByText('تأكيد الحذف');
      const dialogCard = title.closest('.rounded-t-3xl');
      expect(dialogCard).toBeTruthy();
      expect(dialogCard?.className).toContain('sm:rounded-2xl');
      expect(dialogCard?.className).toContain('max-h-[88dvh]');

      const backdrop = dialogCard?.parentElement;
      expect(backdrop?.className).toContain('items-end');
      expect(backdrop?.className).toContain('sm:items-center');
    });
  });
});
