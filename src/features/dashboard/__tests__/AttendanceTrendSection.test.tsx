import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AttendanceTrendSection } from '../components/AttendanceTrendSection';
import { AttendanceTrendPoint } from '@/types/dashboard.types';

const mockTrends: AttendanceTrendPoint[] = [
  { period: 'الأسبوع 1', rate: 94.5 },
  { period: 'الأسبوع 2', rate: 89.0 },
  { period: 'الأسبوع 3', rate: 92.5 },
  { period: 'الأسبوع 4', rate: 96.0 },
];

describe('AttendanceTrendSection Component', () => {
  it('renders skeleton loading state when isLoading is true', () => {
    render(<AttendanceTrendSection isLoading={true} />);
    expect(screen.queryByText('مسار نسبة الحضور عبر الفترات')).not.toBeInTheDocument();
  });

  it('renders empty message when trends data is empty', () => {
    render(<AttendanceTrendSection trends={[]} isLoading={false} />);
    expect(screen.getByText(/لا توجد بيانات حضور كافية/i)).toBeInTheDocument();
  });

  it('renders trend chart with screen reader table and cumulative average', () => {
    render(<AttendanceTrendSection trends={mockTrends} isLoading={false} />);
    expect(screen.getByText('مسار نسبة الحضور عبر الفترات')).toBeInTheDocument();
    expect(screen.getByText(/معدل الحضور التراكمي:/i)).toBeInTheDocument();
    expect(screen.getAllByText('الأسبوع 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الأسبوع 4').length).toBeGreaterThanOrEqual(1);
  });
});
