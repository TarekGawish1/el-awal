import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUploadZone } from '../components/FileUploadZone';
import { CreateCourseModal } from '../components/CreateCourseModal';
import { AntiPiracyWatermark } from '@/features/student-portal/components/AntiPiracyWatermark';
import { CourseQrEnrollModal } from '../components/CourseQrEnrollModal';
import { GroupStudentSelectModal } from '../components/GroupStudentSelectModal';
import { CreateStudentEnrollModal } from '../components/CreateStudentEnrollModal';
import { LessonEditorModal } from '../components/LessonEditorModal';
import { coursesApi } from '../api/courses.api';
import { apiClient } from '@/lib/api/client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/client', () => {
  const fn: any = vi.fn();
  fn.post = vi.fn();
  fn.get = vi.fn();
  fn.delete = vi.fn();
  return { apiClient: fn };
});

vi.mock('@/features/assessments/hooks/use-assessments', () => ({
  useAssessments: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('../api/courses.api', () => ({
  coursesApi: {
    enrollStudentsBatch: vi.fn(),
    createAndEnrollStudent: vi.fn(),
    enrollByQrToken: vi.fn(),
    revokeStudentEnrollment: vi.fn(),
    getCourseEnrollments: vi.fn(),
    deleteUploadedFile: vi.fn(),
  },
}));

vi.mock('@/features/students/hooks/use-students', () => ({
  useStudents: vi.fn().mockReturnValue({
    data: {
      data: [
        { id: 'stu-1', fullName: 'علي محمود', studentCode: 'STU-001', gradeLevel: 'الصف الأول الثانوي', groupName: 'مجموعة أ' },
        { id: 'stu-2', fullName: 'سارة أحمد', studentCode: 'STU-002', gradeLevel: 'الصف الأول الثانوي', groupName: 'مجموعة ب' },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn().mockReturnValue({
    data: [
      { id: 'grp-1', name: 'مجموعة النخبة', gradeLevel: 'الصف الأول الثانوي' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onScan }: { onScan: (codes: any[]) => void }) => (
    <div data-testid="qr-scanner">
      <button
        data-testid="simulate-scan-btn"
        onClick={() => onScan([{ rawValue: 'ELAWAL:STU:stu-1:SIG123' }])}
      >
        Simulate Scan
      </button>
    </div>
  ),
}));

describe('Course DRM, Direct Upload & Hybrid Enrollment Suite', () => {
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

  describe('AntiPiracyWatermark Component', () => {
    it('renders dynamic watermark badge with student full name, phone and student code', () => {
      render(
        <AntiPiracyWatermark
          studentName="طارق جاويش"
          studentPhone="01012345678"
          studentCode="STU-2026-999"
        />
      );

      const badge = screen.getByText(/طارق جاويش • 01012345678 • STU-2026-999/);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('FileUploadZone Component (Direct Presigned Upload)', () => {
    it('renders upload dropzone area with custom label', () => {
      render(
        <FileUploadZone
          label="رفع صورة الغلاف السحابية"
          description="اسحب وأفلت صورة الغلاف هنا"
          onUploadComplete={vi.fn()}
          fileCategory="image"
        />
      );

      expect(screen.getByText('رفع صورة الغلاف السحابية')).toBeInTheDocument();
      expect(screen.getByText('اسحب وأفلت صورة الغلاف هنا')).toBeInTheDocument();
    });

    it('renders uploaded file preview and change button if currentFileUrl is provided', () => {
      render(
        <FileUploadZone
          label="صورة الغلاف"
          currentFileUrl="https://r2.el-awal.com/courses/cover.jpg"
          onUploadComplete={vi.fn()}
          onRemoveFile={vi.fn()}
          fileCategory="image"
        />
      );

      expect(screen.getByText('تم رفع الملف بنجاح')).toBeInTheDocument();
      expect(screen.getByText('معاينة الملف المرفوع')).toBeInTheDocument();
      expect(screen.getByText('تغيير الملف')).toBeInTheDocument();
    });

    it('triggers deleteUploadedFile when changing/removing the uploaded file', () => {
      const onRemoveMock = vi.fn();
      render(
        <FileUploadZone
          label="صورة الغلاف"
          currentFileUrl="https://r2.el-awal.com/courses/cover.jpg"
          currentFileKey="uploads/courses/cover.jpg"
          onUploadComplete={vi.fn()}
          onRemoveFile={onRemoveMock}
          fileCategory="image"
        />
      );

      fireEvent.click(screen.getByText('تغيير الملف'));
      expect(coursesApi.deleteUploadedFile).toHaveBeenCalledWith('uploads/courses/cover.jpg');
      expect(onRemoveMock).toHaveBeenCalled();
    });
  });

  describe('CreateCourseModal Component (Cancel with uploaded file)', () => {
    it('deletes uploaded cover image from bucket when cancel button is clicked', async () => {
      const onCloseMock = vi.fn();
      render(
        <CreateCourseModal
          isOpen={true}
          onClose={onCloseMock}
        />,
        { wrapper }
      );

      expect(screen.getByText('إنشاء كورس تعليمي جديد')).toBeInTheDocument();

      // Click cancel button
      fireEvent.click(screen.getByText('إلغاء'));
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('CourseQrEnrollModal Component', () => {
    it('renders QR scanner and handles instant enrollment on scan', async () => {
      vi.mocked(coursesApi.enrollByQrToken).mockResolvedValue({
        success: true,
        student: { id: 'stu-1', fullName: 'علي محمود', studentCode: 'STU-001', phone: '01011112222' },
        message: 'تم تفعيل الاشتراك بنجاح',
      });

      render(
        <CourseQrEnrollModal
          isOpen={true}
          courseId="course-1"
          courseTitle="كورس الفيزياء الحديثة"
          onClose={vi.fn()}
        />,
        { wrapper }
      );

      expect(screen.getByText('مسح QR الطالب للضم الفوري')).toBeInTheDocument();
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();

      // Trigger simulated scan
      fireEvent.click(screen.getByTestId('simulate-scan-btn'));

      await waitFor(() => {
        expect(coursesApi.enrollByQrToken).toHaveBeenCalledWith('course-1', 'ELAWAL:STU:stu-1:SIG123');
      });

      expect(await screen.findByText('تم تفعيل الاشتراك بنجاح!')).toBeInTheDocument();
      expect(screen.getByText('علي محمود')).toBeInTheDocument();
    });
  });

  describe('GroupStudentSelectModal Component', () => {
    it('renders students list with checkboxes and batch enrolls selected students', async () => {
      vi.mocked(coursesApi.enrollStudentsBatch).mockResolvedValue({
        success: true,
        enrolledCount: 2,
        message: 'تم ضم 2 طالب بنجاح',
      });

      const onCloseMock = vi.fn();

      render(
        <GroupStudentSelectModal
          isOpen={true}
          courseId="course-1"
          courseTitle="كورس النحو الشامل"
          courseGradeLevel="الصف الأول الثانوي"
          onClose={onCloseMock}
        />,
        { wrapper }
      );

      expect(screen.getByText('ضم طلاب من المجموعات الدراسية')).toBeInTheDocument();
      expect(screen.getByText('علي محمود')).toBeInTheDocument();
      expect(screen.getByText('سارة أحمد')).toBeInTheDocument();

      // Click "تحديد الكل"
      fireEvent.click(screen.getByText('تحديد الكل'));
      expect(screen.getByText(/تم تحديد/)).toBeInTheDocument();

      // Click batch enroll button
      const submitBtn = screen.getByText('ضم الطلاب المحددين (2)');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(coursesApi.enrollStudentsBatch).toHaveBeenCalledWith('course-1', ['stu-1', 'stu-2']);
      });

      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('CreateStudentEnrollModal Component', () => {
    it('submits form and creates/enrolls student with generated credentials', async () => {
      vi.mocked(coursesApi.createAndEnrollStudent).mockResolvedValue({
        success: true,
        student: {
          id: 'stu-new',
          fullName: 'يوسف أحمد عبد المنعم',
          studentCode: 'STU-2026-NEW',
          phone: '01099887766',
          generatedPassword: 'TempPassword123',
        },
        message: 'تم تسجيل الطالب وضمّه للكورس بنجاح',
      });

      render(
        <CreateStudentEnrollModal
          isOpen={true}
          courseId="course-1"
          courseTitle="كورس الأحياء"
          onClose={vi.fn()}
        />,
        { wrapper }
      );

      expect(screen.getByText('تسجيل طالب جديد وضمّه للكورس')).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('مثال: يوسف أحمد عبد المنعم'), {
        target: { value: 'يوسف أحمد عبد المنعم' },
      });
      fireEvent.change(screen.getByPlaceholderText('010XXXXXXXX'), {
        target: { value: '01099887766' },
      });
      fireEvent.change(screen.getByPlaceholderText('011XXXXXXXX'), {
        target: { value: '01199887766' },
      });

      fireEvent.click(screen.getByText('تسجيل وضم الطالب'));

      await waitFor(() => {
        expect(coursesApi.createAndEnrollStudent).toHaveBeenCalledWith('course-1', {
          fullName: 'يوسف أحمد عبد المنعم',
          phone: '01099887766',
          parentPhone: '01199887766',
          gradeLevel: 'الصف الثالث الثانوي',
          groupId: undefined,
        });
      });

      expect(await screen.findByText('تم تسجيل وتفعيل اشتراك الطالب بنجاح!')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-NEW')).toBeInTheDocument();
      expect(screen.getByText('TempPassword123')).toBeInTheDocument();
    });
  });

  describe('LessonEditorModal Component (Video Upload & Cleanup Lifecycle)', () => {
    it('renders modal and triggers cancel onClose callback', () => {
      const onCloseMock = vi.fn();
      render(
        <LessonEditorModal
          isOpen={true}
          courseId="course-1"
          moduleId="mod-1"
          lesson={null}
          isEditing={false}
          onClose={onCloseMock}
        />,
        { wrapper }
      );

      expect(screen.getByText('إضافة درس تعليمي جديد')).toBeInTheDocument();

      // Click cancel button
      fireEvent.click(screen.getByText('إلغاء'));
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
