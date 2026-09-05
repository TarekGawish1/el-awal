import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonQuizTab } from '../components/LessonQuizTab';
import { AssessmentSummary } from '@/features/courses/types/courses.types';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/assessments/hooks/use-assessments', () => ({
  useAssessment: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}));

const gradedQuiz: AssessmentSummary = {
  id: 'quiz-1',
  title: 'اختبار الدرس السريع',
  type: 'EXAM',
  totalScore: 20,
  passingScore: 10,
  allowMultipleAttempts: false,
  mySubmission: {
    status: 'GRADED',
    scoreObtained: 18,
    attemptNumber: 1,
  },
};

describe('LessonQuizTab', () => {
  it('renders the "بدء اختبار الدرس الآن" CTA before the exam is taken', () => {
    render(
      <LessonQuizTab
        courseId="course-1"
        lessonId="lesson-1"
        lessonQuiz={{
          id: 'quiz-1',
          title: 'اختبار الدرس السريع',
          type: 'EXAM',
          totalScore: 20,
          allowMultipleAttempts: false,
          mySubmission: null,
        }}
      />,
    );

    expect(screen.getByText('بدء اختبار الدرس الآن')).toBeInTheDocument();
    expect(screen.queryByText(/درجتك في الاختبار:/)).not.toBeInTheDocument();
  });

  it('updates the card from the start CTA to the earned score after completion', () => {
    render(
      <LessonQuizTab
        courseId="course-1"
        lessonId="lesson-1"
        lessonQuiz={gradedQuiz}
      />,
    );

    expect(screen.queryByText('بدء اختبار الدرس الآن')).not.toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('18 / 20') && content.includes('90%')),
    ).toBeInTheDocument();
    expect(screen.getByText('ناجح - أحسنت!')).toBeInTheDocument();
  });

  it('disables the retake button when allowMultipleAttempts is false', () => {
    render(
      <LessonQuizTab
        courseId="course-1"
        lessonId="lesson-1"
        lessonQuiz={gradedQuiz}
      />,
    );

    const exhaustedButton = screen.getByRole('button', {
      name: 'تم استنفاد المحاولة الوحيدة',
    });
    expect(exhaustedButton).toBeDisabled();
    expect(screen.queryByText('إعادة الاختبار مرة أخرى')).not.toBeInTheDocument();
  });

  it('offers the retake button when allowMultipleAttempts is true', () => {
    render(
      <LessonQuizTab
        courseId="course-1"
        lessonId="lesson-1"
        lessonQuiz={{ ...gradedQuiz, allowMultipleAttempts: true }}
      />,
    );

    const retake = screen.getByText('إعادة الاختبار مرة أخرى');
    expect(retake).toBeInTheDocument();
    expect(retake.closest('a')).toHaveAttribute('href', expect.stringContaining('retake=1'));
  });

  describe('Sequential Course Arrangement Enforcement', () => {
    const mockUnitQuiz: AssessmentSummary = {
      id: 'unit-quiz-1',
      title: 'اختبار الوحدة الشامل',
      type: 'EXAM',
      totalScore: 50,
      mySubmission: null,
    };

    const mockCourseQuiz: AssessmentSummary = {
      id: 'course-quiz-1',
      title: 'الامتحان النهائي للكورس',
      type: 'EXAM',
      totalScore: 100,
      mySubmission: null,
    };

    const mockModule: any = {
      id: 'mod-1',
      title: 'الوحدة الأولى',
      unitQuizId: 'unit-quiz-1',
      unitQuiz: mockUnitQuiz,
      lessons: [
        { id: 'les-1', title: 'الدرس 1' },
        { id: 'les-2', title: 'الدرس 2' },
      ],
    };

    it('hides unit and course final exams when enforceSequentialLessons is true and lessons are incomplete', () => {
      render(
        <LessonQuizTab
          courseId="course-1"
          lessonId="les-1"
          unitQuiz={mockUnitQuiz}
          courseQuiz={mockCourseQuiz}
          enforceSequentialLessons={true}
          completedLessonIds={['les-1']} // 1 of 2 completed
          activeModule={mockModule}
          allModules={[mockModule]}
          allLessons={mockModule.lessons}
        />,
      );

      // In enforce mode, unit exam and course exam should NOT be shown until their lessons are finished
      expect(screen.queryByText('اختبار الوحدة 1')).not.toBeInTheDocument();
      expect(screen.queryByText('الامتحان النهائي للكورس')).not.toBeInTheDocument();
    });

    it('unlocks unit exam when all lessons in that unit are completed', () => {
      render(
        <LessonQuizTab
          courseId="course-1"
          lessonId="les-1"
          unitQuiz={mockUnitQuiz}
          courseQuiz={mockCourseQuiz}
          enforceSequentialLessons={true}
          completedLessonIds={['les-1', 'les-2']} // all 2 lessons completed
          activeModule={mockModule}
          allModules={[mockModule]}
          allLessons={mockModule.lessons}
        />,
      );

      // Unit exam is now unlocked
      expect(screen.getByText('الانتقال للامتحان')).toBeInTheDocument();
      expect(screen.queryByText('مقفل حتى إتمام دروس الوحدة')).not.toBeInTheDocument();

      // But course final exam is still locked because unit exam hasn't been submitted yet
      expect(screen.getByText('مقفل حتى إنهاء المنهج')).toBeInTheDocument();
    });

    it('unlocks all exams when enforceSequentialLessons is false', () => {
      render(
        <LessonQuizTab
          courseId="course-1"
          lessonId="les-1"
          unitQuiz={mockUnitQuiz}
          courseQuiz={mockCourseQuiz}
          enforceSequentialLessons={false}
          completedLessonIds={[]}
          activeModule={mockModule}
          allModules={[mockModule]}
          allLessons={mockModule.lessons}
        />,
      );

      expect(screen.getByText('الانتقال للامتحان')).toBeInTheDocument();
      expect(screen.getByText('بدء الامتحان النهائي')).toBeInTheDocument();
    });

    it('uses preview URL for returnUrl when isPreviewMode is true', () => {
      render(
        <LessonQuizTab
          courseId="course-1"
          lessonId="les-1"
          unitQuiz={mockUnitQuiz}
          enforceSequentialLessons={false}
          isPreviewMode={true}
        />,
      );

      const unitExamLink = screen.getByText('الانتقال للامتحان').closest('a');
      expect(unitExamLink).toHaveAttribute(
        'href',
        expect.stringContaining(encodeURIComponent('/teacher/courses/course-1/preview?lessonId=les-1')),
      );
    });
  });
});
