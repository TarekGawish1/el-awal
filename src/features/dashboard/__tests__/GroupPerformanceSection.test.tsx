import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GroupPerformanceSection } from '../components/GroupPerformanceSection';
import { GroupPerformanceItem } from '@/types/dashboard.types';

const mockGroups: GroupPerformanceItem[] = [
  {
    groupId: 'grp-1',
    groupName: 'مجموعة النخبة - 3 ثانوي',
    gradeLevel: 'الصف الثالث الثانوي',
    enrolledCount: 35,
    attendanceRate: 94.2,
    averageExamScore: 82.5,
  },
  {
    groupId: 'grp-2',
    groupName: 'مجموعة الأمل - 2 ثانوي',
    gradeLevel: 'الصف الثاني الثانوي',
    enrolledCount: 28,
    attendanceRate: 78.4,
    averageExamScore: 68.0,
  },
];

describe('GroupPerformanceSection Component', () => {
  it('renders skeleton loading state when isLoading is true', () => {
    render(<GroupPerformanceSection isLoading={true} />);
    expect(screen.queryByText('مقارنة أداء المجموعات الدراسية')).not.toBeInTheDocument();
  });

  it('renders empty message when no groups are provided', () => {
    render(<GroupPerformanceSection groups={[]} isLoading={false} />);
    expect(screen.getByText('لا توجد بيانات مجموعات مسجلة حالياً')).toBeInTheDocument();
  });

  it('renders groups comparison with attendance and exam score rates', () => {
    render(<GroupPerformanceSection groups={mockGroups} isLoading={false} />);
    expect(screen.getByText('مجموعة النخبة - 3 ثانوي')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toBeInTheDocument();
    expect(screen.getByText('مجموعة الأمل - 2 ثانوي')).toBeInTheDocument();
    expect(screen.getByText('78.4%')).toBeInTheDocument();
    expect(screen.getByText('68.0%')).toBeInTheDocument();
  });
});
