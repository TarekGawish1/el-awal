import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AssessmentWizard } from '../components/AssessmentWizard';
import { AssessmentList } from '../components/AssessmentList';
import { SubmissionDetails } from '../components/SubmissionDetails';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useAssessments from '../hooks/use-assessments';
import * as useOnlineStatus from '@/lib/offline/use-online-status';
import { QuestionType } from '../types/assessments.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock hooks
vi.mock('../hooks/use-assessments', () => ({
  useAssessments: vi.fn(),
  useCreateAssessment: vi.fn(),
  useSubmissionDetail: vi.fn(),
  useGradeSubmission: vi.fn(),
}));

vi.mock('@/lib/offline/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}));

const queryClient = new QueryClient();
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Assessment List', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(true);
  });

  it('renders loading state', () => {
    vi.mocked(useAssessments.useAssessments).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    const { container } = renderWithProviders(<AssessmentList />);
    // Just verify it doesn't crash on loading state
    expect(container).toBeInTheDocument();
  });

  it('renders populated state', () => {
    vi.mocked(useAssessments.useAssessments).mockReturnValue({
      data: { data: [{ id: '1', title: 'Test Exam', isPublished: true, totalScore: 100 }] },
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<AssessmentList />);
    expect(screen.getByText('Test Exam')).toBeInTheDocument();
  });

  it('disables assessment creation actions with an Arabic tooltip offline', () => {
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(false);
    vi.mocked(useAssessments.useAssessments).mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<AssessmentList />);

    expect(screen.getByRole('button', { name: 'اختبار جديد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'واجب جديد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إنشاء اختبار جديد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إنشاء واجب جديد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'اختبار جديد' }).parentElement).toHaveAttribute(
      'title',
      'يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت',
    );
  });
});

describe('Assessment Wizard - Create', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(true);
    vi.mocked(useAssessments.useCreateAssessment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it('validates basic metadata', async () => {
    renderWithProviders(<AssessmentWizard />);
    
    const nextButton = screen.getByRole('button', { name: /التالي/i });
    
    // Attempt to proceed without filling required fields
    fireEvent.click(nextButton);
    expect(await screen.findByText('عنوان الاختبار مطلوب ويجب أن يكون 3 أحرف على الأقل')).toBeInTheDocument();
  });

  it('renders the online-required card when the create route is opened offline', () => {
    vi.mocked(useOnlineStatus.useOnlineStatus).mockReturnValue(false);

    renderWithProviders(<AssessmentWizard type="ASSIGNMENT" />);

    expect(screen.getByText('هذه الميزة تتطلب اتصالاً بالإنترنت')).toBeInTheDocument();
    expect(
      screen.getByText('إنشاء الواجبات وتوليد الأسئلة يتطلب اتصالاً نشطاً بالخادم.'),
    ).toBeInTheDocument();
  });
});

describe('Submission Detail & Grading', () => {
  const mockSubmission = {
    id: 's1',
    status: 'SUBMITTED',
    assessment: {
      id: 'a1',
      title: 'Exam 1',
      totalScore: 10,
      questions: [
        { id: 'q1', questionText: 'Q1', questionType: QuestionType.ESSAY, points: 10 }
      ]
    },
    student: { user: { fullName: 'Ali' } },
    answers: [
      { id: 'ans1', questionId: 'q1', answerGiven: 'This is my essay' }
    ]
  };

  beforeEach(() => {
    vi.mocked(useAssessments.useSubmissionDetail).mockReturnValue({
      data: mockSubmission,
      isLoading: false,
      isError: false,
    } as any);
    
    vi.mocked(useAssessments.useGradeSubmission).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it('displays student answer', () => {
    renderWithProviders(<SubmissionDetails submissionId="s1" />);
    expect(screen.getByText('إجابة الطالب: Ali')).toBeInTheDocument();
    expect(screen.getByText('This is my essay')).toBeInTheDocument();
  });
});
