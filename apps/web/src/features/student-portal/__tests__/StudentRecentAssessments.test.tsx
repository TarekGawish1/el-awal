import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentRecentAssessments } from '../components/StudentRecentAssessments';
import { useStudentAssessments } from '../hooks/useStudentPortal';

vi.mock('../hooks/useStudentPortal', () => ({
  useStudentAssessments: vi.fn(),
}));

describe('StudentRecentAssessments scoping', () => {
  beforeEach(() => {
    vi.mocked(useStudentAssessments).mockReturnValue({
      data: {
        data: [
          { id: 'group-exam', title: 'اختبار الفيزياء', courseId: null, lessonId: null, group: { id: 'g1', name: 'مجموعة الصف الأول الثانوي (أ)' }, totalScore: 100, _count: { submissions: 0 } },
          { id: 'online-quiz', title: 'دورة أونلاين: Testggg', courseId: 'c1', course: { id: 'c1', title: 'test' }, group: null, totalScore: 100, _count: { submissions: 0 } },
          { id: 'lesson-quiz', title: 'online course test', courseId: 'c1', lessonId: 'l1', group: null, totalScore: 100, _count: { submissions: 0 } },
        ],
        meta: { nextCursor: null },
      },
      isLoading: false,
    } as any);
  });

  it('renders only physical group exams and excludes online course quizzes', () => {
    render(<StudentRecentAssessments />);
    expect(screen.getByText('اختبار الفيزياء')).toBeInTheDocument();
    expect(screen.getByText('مجموعة الصف الأول الثانوي (أ)')).toBeInTheDocument();
    expect(screen.queryByText('دورة أونلاين: Testggg')).not.toBeInTheDocument();
    expect(screen.queryByText('online course test')).not.toBeInTheDocument();
  });
});
