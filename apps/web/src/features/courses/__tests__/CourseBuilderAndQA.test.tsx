import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LessonQAPanel } from '@/features/student-portal/components/LessonQAPanel';
import { LessonSummaryTab } from '@/features/student-portal/components/LessonSummaryTab';
import { LessonResourcesTab } from '@/features/student-portal/components/LessonResourcesTab';
import { LessonQuizTab } from '@/features/student-portal/components/LessonQuizTab';
import { StudentCourseLearningRoom } from '@/features/student-portal/components/StudentCourseLearningRoom';
import { LessonEditorModal } from '@/features/courses/components/LessonEditorModal';
import { CourseManagementContainer } from '@/features/courses/components/CourseManagementContainer';
import { CourseBuilderView } from '@/features/courses/components/CourseBuilderView';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { coursesApi } from '@/features/courses/api/courses.api';

// Mock dependencies
vi.mock('@/features/courses/api/courses.api', () => ({
  coursesApi: {
    getLessonQuestions: vi.fn(),
    createQuestion: vi.fn(),
    createReply: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    updateReply: vi.fn(),
    deleteReply: vi.fn(),
    getTeacherCourses: vi.fn(),
    getCourseDetails: vi.fn(),
    getLessonViewer: vi.fn(),
    getLessonStreamAuth: vi.fn(),
    updateLessonProgress: vi.fn(),
    deleteCourse: vi.fn(),
    getVideoUploadCredentials: vi.fn(),
  },
}));

vi.mock('@/features/assessments/hooks/use-assessments', () => ({
  useAssessments: vi.fn().mockReturnValue({
    data: { data: [] },
    isLoading: false,
  }),
  useAssessment: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'user-1', fullName: 'طالب منصة الأول', phone: '01012345678' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/lib/offline/use-online-status', () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
}));

describe('Arabic Localized Course Learning Room & Multi-Level Tabs', () => {
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

  describe('ConfirmModal Component (Custom Popups, No JS Confirm)', () => {
    it('renders custom confirmation modal with title and message and calls onConfirm when clicked', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmModal
          isOpen={true}
          title="تأكيد حذف الكورس"
          message="هل أنت متأكد من حذف هذا الكورس وجميع دروسه؟"
          confirmLabel="حذف الكورس نهائياً"
          cancelLabel="تراجع"
          variant="danger"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      expect(screen.getByText('تأكيد حذف الكورس')).toBeInTheDocument();
      expect(screen.getByText('هل أنت متأكد من حذف هذا الكورس وجميع دروسه؟')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'حذف الكورس نهائياً' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('CourseManagementContainer Component (Light Theme & Custom Delete Popup)', () => {
    it('opens custom confirmation modal on delete click without triggering browser window.confirm', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      vi.mocked(coursesApi.getTeacherCourses).mockResolvedValue([
        {
          id: 'course-1',
          title: 'كورس النحو الشامل',
          subject: 'اللغة العربية',
          gradeLevel: 'الصف الثالث الثانوي',
          academicStage: 'المرحلة الثانوية',
          price: 150,
          status: 'PUBLISHED',
          totalLessons: 8,
          modules: [],
          _count: { enrollments: 12 },
        } as any,
      ]);

      render(<CourseManagementContainer />, { wrapper });

      expect(await screen.findByText('كورس النحو الشامل')).toBeInTheDocument();
      expect(screen.getByText('الكورسات والدورات التدريبية أونلاين')).toBeInTheDocument();

      const deleteBtn = screen.getByTitle('حذف الكورس');
      fireEvent.click(deleteBtn);

      // Browser native confirm should NOT have been called
      expect(confirmSpy).not.toHaveBeenCalled();

      // Custom popup should be rendered
      expect(screen.getByText('تأكيد حذف الكورس')).toBeInTheDocument();
      expect(screen.getByText(/هل أنت متأكد من حذف كورس "كورس النحو الشامل" نهائياً/i)).toBeInTheDocument();

      confirmSpy.mockRestore();
    });
  });

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

      // Question content should be displayed in Arabic
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

    it('submits a new question with integer timestamp and resets input', async () => {
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue([]);
      vi.mocked(coursesApi.createQuestion).mockResolvedValue({
        id: 'q-new',
        content: 'سؤال جديد حول كان وأخواتها',
        videoTimestamp: 45,
        lessonId: 'lesson-1',
        studentId: 'stu-1',
        studentName: 'طالب منصة الأول',
        createdAt: '2026-08-23T12:00:00Z',
        updatedAt: '2026-08-23T12:00:00Z',
        replies: [],
      });

      render(
        <LessonQAPanel
          lessonId="lesson-1"
          currentPlaybackSeconds={45.7}
          onSeekToTimestamp={vi.fn()}
        />,
        { wrapper }
      );

      const textarea = screen.getByPlaceholderText(/اكتب سؤالك بوضوح/i);
      fireEvent.change(textarea, { target: { value: 'سؤال جديد حول كان وأخواتها' } });
      fireEvent.click(screen.getByRole('checkbox'));

      const submitBtn = screen.getByRole('button', { name: /نشر السؤال/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(coursesApi.createQuestion).toHaveBeenCalledWith('lesson-1', {
          content: 'سؤال جديد حول كان وأخواتها',
          videoTimestamp: 45,
        });
      });

      expect(textarea).toHaveValue('');
    });

    it('blocks submitting questions containing insults or bad words and does not call createQuestion', async () => {
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue([]);
      render(
        <LessonQAPanel
          lessonId="lesson-1"
          currentPlaybackSeconds={10}
          onSeekToTimestamp={vi.fn()}
        />,
        { wrapper }
      );

      const textarea = screen.getByPlaceholderText(/اكتب سؤالك بوضوح/i);
      fireEvent.change(textarea, { target: { value: 'fuck you bitch' } });

      const submitBtn = screen.getByRole('button', { name: /نشر السؤال/i });
      fireEvent.click(submitBtn);

      expect(coursesApi.createQuestion).not.toHaveBeenCalled();
    });

    it('allows editing a question and calls coursesApi.updateQuestion', async () => {
      const mockQuestions = [
        {
          id: 'q-edit-1',
          content: 'سؤال بحاجة لتعديل',
          videoTimestamp: null,
          lessonId: 'lesson-1',
          studentId: 'user-1',
          studentUserId: 'user-1',
          studentName: 'طالب منصة الأول',
          createdAt: '2026-08-23T10:00:00Z',
          updatedAt: '2026-08-23T10:00:00Z',
          replies: [],
        },
      ];
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue(mockQuestions);
      vi.mocked(coursesApi.updateQuestion).mockResolvedValue({
        ...mockQuestions[0],
        content: 'سؤال تم تعديله وتوضيحه',
      });

      render(
        <LessonQAPanel
          lessonId="lesson-1"
          onSeekToTimestamp={vi.fn()}
        />,
        { wrapper }
      );

      // Find edit button
      const editBtn = await screen.findByTitle('تعديل السؤال');
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);

      // Edit input should appear
      const editInput = screen.getByDisplayValue('سؤال بحاجة لتعديل');
      fireEvent.change(editInput, { target: { value: 'سؤال تم تعديله وتوضيحه' } });

      const saveBtn = screen.getByRole('button', { name: /حفظ التعديل/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(coursesApi.updateQuestion).toHaveBeenCalledWith('q-edit-1', {
          content: 'سؤال تم تعديله وتوضيحه',
        });
      });
    });

    it('opens confirm modal on delete click and calls coursesApi.deleteQuestion', async () => {
      const mockQuestions = [
        {
          id: 'q-del-1',
          content: 'سؤال سيتم حذفه',
          videoTimestamp: null,
          lessonId: 'lesson-1',
          studentId: 'user-1',
          studentUserId: 'user-1',
          studentName: 'طالب منصة الأول',
          createdAt: '2026-08-23T10:00:00Z',
          updatedAt: '2026-08-23T10:00:00Z',
          replies: [],
        },
      ];
      vi.mocked(coursesApi.getLessonQuestions).mockResolvedValue(mockQuestions);
      vi.mocked(coursesApi.deleteQuestion).mockResolvedValue(undefined);

      render(
        <LessonQAPanel
          lessonId="lesson-1"
          onSeekToTimestamp={vi.fn()}
        />,
        { wrapper }
      );

      const deleteBtn = await screen.findByTitle('حذف السؤال');
      fireEvent.click(deleteBtn);

      // Confirmation modal should open
      expect(screen.getByText('تأكيد حذف السؤال')).toBeInTheDocument();
      expect(screen.getByText(/هل أنت متأكد من حذف هذا السؤال/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /نعم، احذف نهائياً/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(coursesApi.deleteQuestion).toHaveBeenCalledWith('q-del-1');
      });
    });
  });

  describe('Content Moderation Utility (validateContentProfanity)', () => {
    it('detects and blocks Arabic profanities and insults', async () => {
      const { validateContentProfanity } = await import('@/lib/validation/content-moderation');
      expect(validateContentProfanity('احا')).not.toBeNull();
      expect(validateContentProfanity('أحا ايه دا')).not.toBeNull();
      expect(validateContentProfanity('كسمك')).not.toBeNull();
      expect(validateContentProfanity('يا شرموط')).not.toBeNull();
      expect(validateContentProfanity('يا خول')).not.toBeNull();
      expect(validateContentProfanity('يا ابن الكلب')).not.toBeNull();
      expect(validateContentProfanity('يا معرص')).not.toBeNull();
      expect(validateContentProfanity('سكس')).not.toBeNull();
    });

    it('detects and blocks Franco-Arabic (3rabizi) insults and swear words', async () => {
      const { validateContentProfanity } = await import('@/lib/validation/content-moderation');
      expect(validateContentProfanity('a7a')).not.toBeNull();
      expect(validateContentProfanity('a7a ايه ده')).not.toBeNull();
      expect(validateContentProfanity('kosomk')).not.toBeNull();
      expect(validateContentProfanity('kossomak')).not.toBeNull();
      expect(validateContentProfanity('5awal')).not.toBeNull();
      expect(validateContentProfanity('ya 3ars')).not.toBeNull();
      expect(validateContentProfanity('ebn el was5a')).not.toBeNull();
      expect(validateContentProfanity('sharmouta')).not.toBeNull();
      expect(validateContentProfanity('manyook')).not.toBeNull();
      expect(validateContentProfanity('teezak')).not.toBeNull();
      expect(validateContentProfanity('ga7ba')).not.toBeNull();
      expect(validateContentProfanity('yel3an deenak')).not.toBeNull();
    });

    it('detects and blocks English profanities, abbreviations, and bypasses', async () => {
      const { validateContentProfanity } = await import('@/lib/validation/content-moderation');
      expect(validateContentProfanity('fuck you bitch')).not.toBeNull();
      expect(validateContentProfanity('you are a bitch')).not.toBeNull();
      expect(validateContentProfanity('f*ck this shit')).not.toBeNull();
      expect(validateContentProfanity('f u c k')).not.toBeNull();
      expect(validateContentProfanity('asshole')).not.toBeNull();
      expect(validateContentProfanity('stfu')).not.toBeNull();
      expect(validateContentProfanity('motherfucker')).not.toBeNull();
      expect(validateContentProfanity('retard')).not.toBeNull();
    });

    it('allows clean and educational content without false positives', async () => {
      const { validateContentProfanity } = await import('@/lib/validation/content-moderation');
      expect(validateContentProfanity('ما هو إعراب كلمة طالباً؟')).toBeNull();
      expect(validateContentProfanity('شكراً جزيلاً يا مستر على الشرح الرائع')).toBeNull();
      expect(validateContentProfanity('هل يجوز تقديم خبر كان على اسمها في حالة النكرة؟')).toBeNull();
      expect(validateContentProfanity('الفيزياء والرياضيات ممتعة')).toBeNull();
    });
  });

  describe('LessonResourcesTab Component', () => {
    it('renders localized attachment resources with download link', () => {
      const mockAttachments = [
        {
          id: 'att-1',
          title: 'ملخص النحو الشامل',
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

      expect(screen.getByText('ملخص النحو الشامل')).toBeInTheDocument();
      expect(screen.getByText(/2.00 ميجابايت/i)).toBeInTheDocument();
      const downloadLink = screen.getByRole('link', { name: /تحميل/i });
      expect(downloadLink).toHaveAttribute('href', 'https://assets.elawal.com/summary.pdf');
    });
  });

  describe('LessonQuizTab Component (Multi-Level Quizzes)', () => {
    it('renders Lesson Quiz, Unit Quiz, and Course Final Exam in clean Arabic without English words', () => {
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

      // Ensure no English terms like Course Final Exam exist in the output
      expect(screen.queryByText(/Course Final Exam/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Processing video/i)).not.toBeInTheDocument();
    });
  });

  describe('LessonEditorModal Component (No Manual ID Inputs)', () => {
    it('renders direct upload dropzone and does NOT render manual video ID input fields', () => {
      render(
        <LessonEditorModal
          isOpen={true}
          courseId="course-1"
          moduleId="mod-1"
          lesson={null}
          onClose={vi.fn()}
        />,
        { wrapper }
      );

      expect(screen.getByText('إضافة درس تعليمي جديد')).toBeInTheDocument();
      expect(screen.getByText(/انقر لاختيار فيديو أو سحبه هنا/i)).toBeInTheDocument();

      // Ensure no manual ID text inputs exist
      expect(screen.queryByText(/أو أدخل معرف الفيديو المشفر يدوياً/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/9f8a7b6c/i)).not.toBeInTheDocument();
    });
  });

  describe('StudentCourseLearningRoom Component (Transcoding State Handling & 16:9 Aspect Ratio)', () => {
    it('renders interactive Arabic placeholder card and strict aspect-video container when videoStatus is PROCESSING', async () => {
      vi.mocked(coursesApi.getCourseDetails).mockResolvedValue({
        id: 'course-1',
        title: 'كورس النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        status: 'PUBLISHED',
        modules: [
          {
            id: 'mod-1',
            title: 'الوحدة الأولى',
            lessons: [
              { id: 'les-1', title: 'شرح كان وأخواتها', isPreview: true },
            ],
          },
        ],
      } as any);

      vi.mocked(coursesApi.getLessonViewer).mockResolvedValue({
        id: 'les-1',
        title: 'شرح كان وأخواتها',
        videoPlayerUrl: 'https://iframe.mediadelivery.net/embed/123/video-1',
      } as any);

      vi.mocked(coursesApi.getLessonStreamAuth).mockResolvedValue({
        lessonId: 'les-1',
        courseId: 'course-1',
        title: 'شرح كان وأخواتها',
        videoId: 'video-1',
        videoStatus: 'PROCESSING',
        embedUrl: 'https://iframe.mediadelivery.net/embed/123/video-1',
        playbackUrl: '',
        isPreview: true,
        watermark: {
          studentName: 'طالب منصة الأول',
          studentPhone: '01012345678',
          studentCode: 'STU-001',
        },
      });

      const { container } = render(
        <StudentCourseLearningRoom courseId="course-1" initialLessonId="les-1" />,
        { wrapper }
      );

      expect(await screen.findByText('الفيديو قيد المعالجة السحابية')).toBeInTheDocument();
      expect(screen.getByText(/نقوم حالياً بتهيئة الفيديو وتوليد الجودات المتعددة/i)).toBeInTheDocument();
      expect(screen.getByText('تحديث حالة الفيديو')).toBeInTheDocument();

      // Check aspect-video and overflow-hidden classes on the video wrapper
      const videoWrapper = container.querySelector('.aspect-video');
      expect(videoWrapper).toBeInTheDocument();
      expect(videoWrapper).toHaveClass('overflow-hidden');
    });

    it('renders Teacher Preview Mode badge and back link to Course Builder when user is a TEACHER', async () => {
      vi.mocked(coursesApi.getCourseDetails).mockResolvedValue({
        id: 'course-1',
        title: 'كورس النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        status: 'PUBLISHED',
        modules: [
          {
            id: 'mod-1',
            title: 'الوحدة الأولى',
            lessons: [
              { id: 'les-1', title: 'شرح كان وأخواتها', isPreview: true },
            ],
          },
        ],
      } as any);

      // Re-mock useAuth with TEACHER role
      const { useAuth } = await import('@/features/auth');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'teacher-1', fullName: 'أ. طارق عبد الله', role: 'TEACHER' },
      } as any);

      render(
        <StudentCourseLearningRoom courseId="course-1" initialLessonId="les-1" />,
        { wrapper }
      );

      expect(await screen.findByText('وضع معاينة المعلم')).toBeInTheDocument();
      const backLink = screen.getByTitle('العودة لتعديل وبناء الكورس');
      expect(backLink).toHaveAttribute('href', '/teacher/courses/course-1');
    });
  });

  describe('CourseBuilderView Component Preview Button', () => {
    it('renders معاينة قاعة المشاهدة link targeting /teacher/courses/[id]/preview with _blank', async () => {
      vi.mocked(coursesApi.getCourseDetails).mockResolvedValue({
        id: 'course-1',
        title: 'كورس النحو والبلاغة',
        subject: 'اللغة العربية',
        gradeLevel: 'الصف الثالث الثانوي',
        status: 'PUBLISHED',
        modules: [],
        groupAccess: [],
      } as any);

      render(<CourseBuilderView courseId="course-1" />, { wrapper });

      const previewLink = await screen.findByRole('link', { name: /معاينة قاعة المشاهدة/i });
      expect(previewLink).toBeInTheDocument();
      expect(previewLink).toHaveAttribute('href', '/teacher/courses/course-1/preview');
      expect(previewLink).toHaveAttribute('target', '_blank');
    });
  });
});
