import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DashboardKpiGrid } from '../components/DashboardKpiGrid';
import { DashboardKpiData } from '@/types/dashboard.types';

const mockKpis: DashboardKpiData = {
  todaySessionsCount: 3,
  activeSessionsCount: 1,
  totalActiveStudents: 284,
  totalActiveGroups: 6,
  weeklyAttendanceRate: 92.4,
  attendanceRateDelta: 2.1,
  pendingGradingCount: 18,
  pendingGradingAssessmentsCount: 2,
};

describe('DashboardKpiGrid Component', () => {
  it('renders skeleton loading state when isLoading is true', () => {
    render(<DashboardKpiGrid isLoading={true} />);
    const region = screen.getByRole('region', { name: /تحميل المؤشرات/i });
    expect(region).toBeInTheDocument();
  });

  it('renders all 4 primary KPIs with exact numbers and labels', () => {
    render(<DashboardKpiGrid kpis={mockKpis} isLoading={false} />);

    // KPI 1: Today's Sessions
    expect(screen.getByText('حصص اليوم')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/1 حصة جارية الآن/i)).toBeInTheDocument();

    // KPI 2: Active Students
    expect(screen.getByText('الطلاب النشطون')).toBeInTheDocument();
    expect(screen.getByText('284')).toBeInTheDocument();
    expect(screen.getByText(/موزعون على 6 مجموعات/i)).toBeInTheDocument();

    // KPI 3: Weekly Attendance Rate
    expect(screen.getByText('نسبة الحضور الأسبوعي')).toBeInTheDocument();
    expect(screen.getByText('92.4%')).toBeInTheDocument();
    expect(screen.getByText('+2.1%')).toBeInTheDocument();
    expect(screen.getByText(/مستوى مستقر/i)).toBeInTheDocument();

    // KPI 4: Pending Grading
    expect(screen.getByText('واجبات بانتظار التصحيح')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText(/عبر 2 اختبارات وواجبات نشطة/i)).toBeInTheDocument();
  });

  it('renders zero pending grading state with success confirmation', () => {
    const zeroGradingKpis: DashboardKpiData = {
      ...mockKpis,
      pendingGradingCount: 0,
      pendingGradingAssessmentsCount: 0,
    };

    render(<DashboardKpiGrid kpis={zeroGradingKpis} isLoading={false} />);
    expect(screen.getByText('تم تصحيح جميع التسليمات')).toBeInTheDocument();
  });
});
