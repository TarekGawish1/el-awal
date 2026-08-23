import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LessonQAPanel } from '@/features/student-portal/components/LessonQAPanel';
import { LessonSummaryTab } from '@/features/student-portal/components/LessonSummaryTab';
import { LessonResourcesTab } from '@/features/student-portal/components/LessonResourcesTab';
import { LessonQuizTab } from '@/features/student-portal/components/LessonQuizTab';
import { coursesApi } from '@/features/courses/api/courses.api';

// Mock coursesApi
vi.mock('@/features/courses/api/courses.api', () => ({
  coursesApi: {
    getLessonQuestions: vi.fn(),
    createQuestion: vi.fn(),
    createReply: vi.fn(),
  },
}));

describe('Udemy-Style Learning Room: Multi-Level Tabs & Timestamped Q&A', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('LessonQAPanel Component', () => {
    const mockQuestions = [
      {
        id: 'q-1',
        content: 'ما هو إعراب كلمة طالباً في المثال؟',
        videoTimestamp: 225, // 03:45
        lessonId: 'lesson-1',
        studentId: 'stu-1',
        studentName: 'أحمد محمود',
        createdAt: '2026-08-23T10:00:00Z',
        updatedAt: '2026-08-23T10:00:00Z',
        replies: [
          {
            id: 'rep-1',
            content: 'تعرب تمييز منصوب بالفتحة.',
            questionId: 'q-1',
            authorId: 'teacher-1',
            authorRole: 'TEACHER',
            authorName: 'أ. طارق جاويش',
            createdAt: '2026-08-23T10:15:00Z',
          },
        ],
      },
    ];

    it('renders questions list with clickable timestamp chip', async () => {
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue(mockQuestions);
      const onSeekMock = vi.fn();

      render(
        <LessonQAPanel
          lessonId="lesson-1"
          currentPlaybackSeconds={120}
          onSeekToTimestamp={onSeekMock}
        />,
        { wrapper }
      );

      // Question content should be displayed
      expect(await screen.findByText('ما هو إعراب كلمة طالباً في المثال؟')).toBeInTheDocument();
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
      expect(screen.getByText('تعرب تمييز منصوب بالفتحة.')).toBeInTheDocument();
      expect(screen.getByText('أ. طارق جاويش')).toBeInTheDocument();

      // Timestamp chip should show 03:45
      const timestampChip = screen.getByText('03:45');
      expect(timestampChip).toBeInTheDocument();

      // Clicking timestamp chip calls seek to 225 seconds
      fireEvent.click(timestampChip);
      expect(onSeekMock).toHaveBeenCalledWith(225);
    });

    it('submits a new timestamped question capturing the current playback second', async () => {
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue([]);
      vi.mocked(coursesApi.createQuestion).mockResolvedValue({
        id: 'q-2',
        content: 'سؤال جديد أثناء الشرح',
        videoTimestamp: 180,
        lessonId: 'lesson-1',
        studentId: 'stu-1',
        studentName: 'طالب مسجل',
        createdAt: '2026-08-23T12:00:00Z',
        updatedAt: '2026-08-23T12:00:00Z',
        replies: [],
      });

      render(
        <LessonQAPanel
          lessonId="lesson-1"
          currentPlaybackSeconds={180} // 03:00
          onSeekToTimestamp={vi.fn()}
        />,
        { wrapper }
      );

      const textarea = screen.getByPlaceholderText(/اكتب سؤالك بوضوح/i);
      fireEvent.change(textarea, { target: { value: 'سؤال جديد أثناء الشرح' } });

      const submitButton = screen.getByRole('button', { name: /نشر السؤال/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(coursesApi.createQuestion).toHaveBeenCalledWith('lesson-1', {
          content: 'سؤال جديد أثناء الشرح',
          videoTimestamp: 180,
        });
      });
    });
  });

  describe('LessonSummaryTab Component', () => {
    it('renders study notes, formulas, and lesson objectives', () => {
      render(
        <LessonSummaryTab
          lessonTitle="كان وأخواتها"
          description="التعرف على الأفعال الناسخة"
          summary="### ملخص الدرس\n- ترفع المبتدأ وتنصب الخبر"
        />
      );

      expect(screen.getByText(/ملخص وملاحظات: كان وأخواتها/i)).toBeInTheDocument();
      expect(screen.getByText('التعرف على الأفعال الناسخة')).toBeInTheDocument();
      expect(screen.getByText(/ترفع المبتدأ وتنصب الخبر/i)).toBeInTheDocument();
    });
  });

  describe('LessonResourcesTab Component', () => {
    it('renders downloadable PDF attachments with file size', () => {
      const mockAttachments = [
        {
          id: 'att-1',
          title: 'ملخص النحو الشامل PDF',
          fileUrl: 'https://assets.elawal.com/summary.pdf',
          fileKey: 'courses/summary.pdf',
          fileSize: 2097152, // 2 MB
          fileType: 'application/pdf',
          lessonId: 'lesson-1',
          createdAt: '2026-08-23T10:00:00Z',
        },
      ];

      render(
        <LessonResourcesTab
          lessonTitle="كان وأخواتها"
          attachments={mockAttachments}
        />
      );

      expect(screen.getByText('ملخص النحو الشامل PDF')).toBeInTheDocument();
      expect(screen.getByText(/2.00 ميجابايت/i)).toBeInTheDocument();
      const downloadLink = screen.getByRole('link', { name: /تحميل/i });
      expect(downloadLink).toHaveAttribute('href', 'https://assets.elawal.com/summary.pdf');
    });
  });

  describe('LessonQuizTab Component (Multi-Level Quizzes)', () => {
    it('renders Lesson Quiz, Unit Quiz, and Course Final Exam links', () => {
      render(
        <LessonQuizTab
          lessonTitle="كان وأخواتها"
          lessonQuiz={{
            id: 'quiz-lesson-1',
            title: 'اختبار سريع على كان وأخواتها',
            type: 'QUIZ',
            totalScore: 20,
          }}
          unitQuiz={{
            id: 'quiz-unit-1',
            title: 'اختبار شامل للوحدة الأولى',
            type: 'EXAM',
            totalScore: 50,
          }}
          courseQuiz={{
            id: 'quiz-course-final',
            title: 'الامتحان النهائي لكورس النحو',
            type: 'EXAM',
            totalScore: 100,
          }}
        />
      );

      expect(screen.getByText('اختبار سريع على كان وأخواتها')).toBeInTheDocument();
      expect(screen.getByText(/الدرجة الإجمالية: 20 درجة/i)).toBeInTheDocument();
      expect(screen.getByText(/اختبار شامل للوحدة الأولى/i)).toBeInTheDocument();
      expect(screen.getByText(/الامتحان النهائي لكورس النحو/i)).toBeInTheDocument();
    });
  });
});
