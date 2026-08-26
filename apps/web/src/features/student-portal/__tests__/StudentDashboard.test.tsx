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
  useStudentGroup: vi.fn().mockReturnValue({ data: null }),
  useStudentGroupSessions: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useSendHomeworkUpload: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSubmitHomework: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
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

    // useStudentCourses returns a BARE ARRAY (/courses/my-courses is unwrapped by apiClient)
    vi.mocked(useStudentCourses).mockReturnValue({
      data: [{ courseId: 'c1', title: 'دورة الفيزياء', teacherName: 'أ. أحمد', progressPercentage: 50 }],
      isLoading: false,
    } as any);

    // useStudentAssessments returns { data, meta } (cursor pagination; meta has NO totalItems)
    vi.mocked(useStudentAssessments).mockReturnValue({
      data: {
        data: [
          { id: 'a1', title: 'اختبار نصف العام', type: 'EXAM', totalScore: 100, group: { id: 'g1', name: 'المجموعة أ' }, _count: { submissions: 0 } },
          { id: 'a2', title: 'اختبار الشهر', type: 'EXAM', totalScore: 50, group: { id: 'g1', name: 'المجموعة أ' }, _count: { submissions: 1 } },
        ],
        meta: { nextCursor: null, prevCursor: null, hasMore: false, limit: 20 },
      },
      isLoading: false,
    } as any);

    // useStudentAttendance returns { data, meta }; rate is derived client-side (present / total).
    // 3 PRESENT of 4 records => 75%.
    vi.mocked(useStudentAttendance).mockReturnValue({
      data: {
        data: [
          { id: 'r1', status: 'PRESENT' },
          { id: 'r2', status: 'PRESENT' },
          { id: 'r3', status: 'PRESENT' },
          { id: 'r4', status: 'ABSENT' },
        ],
        meta: { nextCursor: null, prevCursor: null, hasMore: false, limit: 20 },
      },
      isLoading: false,
    } as any);

    render(<StudentDashboard />);
    
    // Welcome message
    expect(screen.getByText(/أهلاً بك، طالب افتراضي/)).toBeInTheDocument();
    expect(screen.getByText(/الكود: STU-123/)).toBeInTheDocument();
    
    // Group Badge
    expect(screen.getAllByText('المجموعة أ').length).toBeGreaterThan(0);
    
    // KPIs
    expect(screen.getByText('75%')).toBeInTheDocument(); // Attendance rate (3 present / 4 = 75%)
    expect(screen.getByText('2')).toBeInTheDocument(); // Assessment count (data.length)
    expect(screen.getAllByText('1')).toHaveLength(2); // Group and courses counts
    
    // Content sections
    expect(screen.getByText('دورة الفيزياء')).toBeInTheDocument();
    expect(screen.getByText('اختبار نصف العام')).toBeInTheDocument();
  });
});
