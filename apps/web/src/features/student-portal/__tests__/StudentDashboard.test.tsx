import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentDashboard } from '../components/StudentDashboard';
import { useStudentProfile, useStudentCourses, useStudentAssessments, useStudentAttendance } from '../hooks/useStudentPortal';

vi.mock('../hooks/useStudentPortal', () => ({
  useStudentProfile: vi.fn(),
  useStudentCourses: vi.fn(),
  useStudentAssessments: vi.fn(),
  useStudentAttendance: vi.fn(),
  useGroupSessions: vi.fn().mockReturnValue({ data: [] }),
}));

describe('StudentDashboard', () => {
  it('renders student welcome and dashboard data correctly', () => {
    vi.mocked(useStudentProfile).mockReturnValue({
      data: {
        id: 'stu-1',
        studentCode: 'STU-123',
        gradeLevel: 'Grade 10',
        user: { fullName: 'طالب افتراضي' },
        groupEnrollments: [
          { group: { id: 'g1', name: 'المجموعة أ' } }
        ]
      },
      isLoading: false,
    } as any);

    vi.mocked(useStudentCourses).mockReturnValue({
      data: { data: [{ id: 'c1', title: 'دورة الفيزياء', progressPercentage: 50 }] },
      isLoading: false,
    } as any);

    vi.mocked(useStudentAssessments).mockReturnValue({
      data: { meta: { totalItems: 2 }, data: [{ id: 'a1', title: 'اختبار نصف العام', totalScore: 100 }] },
      isLoading: false,
    } as any);

    vi.mocked(useStudentAttendance).mockReturnValue({
      data: { meta: { attendanceRate: 95 } },
      isLoading: false,
    } as any);

    render(<StudentDashboard />);
    
    // Welcome message
    expect(screen.getByText(/أهلاً بك، طالب افتراضي/)).toBeInTheDocument();
    expect(screen.getByText(/الكود: STU-123/)).toBeInTheDocument();
    
    // Group Badge
    expect(screen.getByText('المجموعة أ')).toBeInTheDocument();
    
    // KPIs
    expect(screen.getByText('95%')).toBeInTheDocument(); // Attendance rate
    expect(screen.getByText('2')).toBeInTheDocument(); // Assessment count
    expect(screen.getByText('1')).toBeInTheDocument(); // Courses count
    
    // Content sections
    expect(screen.getByText('دورة الفيزياء')).toBeInTheDocument();
    expect(screen.getByText('اختبار نصف العام')).toBeInTheDocument();
  });
});
