import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardBreadcrumbs } from '../components/DashboardBreadcrumbs';
import * as navigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('DashboardBreadcrumbs Component', () => {
  it('renders "الواجبات المنزلية" for /student/homework instead of English text', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/student/homework');

    render(<DashboardBreadcrumbs />);

    expect(screen.getByText('الواجبات المنزلية')).toBeDefined();
    expect(screen.queryByText('homework')).toBeNull();
  });

  it('renders "الاختبارات" for /student/assessments', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/student/assessments');

    render(<DashboardBreadcrumbs />);

    expect(screen.getByText('الاختبارات')).toBeDefined();
  });

  it('renders "الواجبات والاختبارات" for /teacher/assessments', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/teacher/assessments');

    render(<DashboardBreadcrumbs />);

    expect(screen.getByText('الواجبات والاختبارات')).toBeDefined();
  });

  it('renders "رسائل الموقع والاستفسارات" for /teacher/inquiries', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/teacher/inquiries');

    render(<DashboardBreadcrumbs />);

    expect(screen.getByText('رسائل الموقع والاستفسارات')).toBeDefined();
  });

  it('renders "سجل النشاطات" for /teacher/activity-log', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/teacher/activity-log');

    render(<DashboardBreadcrumbs />);

    expect(screen.getByText('سجل النشاطات')).toBeDefined();
  });
});
