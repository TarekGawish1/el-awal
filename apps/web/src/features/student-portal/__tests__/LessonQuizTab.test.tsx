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
});
