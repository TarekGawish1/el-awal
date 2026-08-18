import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeacherStudentsPage from '@/app/(dashboard)/teacher/students/page';
import StudentDetailPage from '@/app/(dashboard)/teacher/students/[id]/page';
import * as useStudentsModule from '@/features/students/hooks/use-students';
import * as useGroupsModule from '@/features/groups/hooks/useGroups';
import * as nextNavigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
    put: vi.fn().mockResolvedValue({ activeAcademicYear: '2025-2026', activeAcademicTerm: 'FIRST_TERM' }),
  },
}));

vi.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code">QR Code Mock</div>,
}));

describe('TeacherStudents', () => {
  let queryClient: QueryClient;

  const mockGroups = [
    {
      id: 'grp-1',
      name: 'مجموعة الصف الخامس أ',
      gradeLevel: 'الصف الخامس الابتدائي',
      academicYear: '2025-2026',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
    },
    {
      id: 'grp-old',
      name: 'مجموعة قديمة 2020',
      gradeLevel: 'الصف الخامس الابتدائي',
      academicYear: '2020-2021',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
    },
    {
      id: 'grp-sec',
      name: 'مجموعة ثانوي',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2025-2026',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
    },
  ];

  const mockPaginatedStudents = {
    data: [
      {
        id: 'stu-1',
        studentCode: 'STU-2026-0001',
        gradeLevel: 'الصف الخامس الابتدائي',
        academicStage: 'PRIMARY',
        academicStatus: 'ACTIVE',
        createdAt: '2026-08-17',
        user: { id: 'usr-1', fullName: 'Ahmed Ali' },
        groupEnrollments: [{ group: { id: 'grp-1', name: 'مجموعة الصف الخامس أ' } }],
      },
    ],
    meta: {
      hasMore: false,
      nextCursor: null,
      prevCursor: null,
      limit: 10,
    },
  };

  const mockStudentDetail = {
    ...mockPaginatedStudents.data[0],
    parentLinks: [],
  };

  const mockQrResponse = {
    studentId: 'stu-1',
    studentCode: 'STU-2026-0001',
    fullName: 'Ahmed Ali',
    gradeLevel: 'الصف الخامس الابتدائي',
    qrCodeToken: 'qr_tok_123',
  };

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({
      data: mockGroups as any,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useStudents').mockReturnValue({
      data: mockPaginatedStudents,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useStudent').mockReturnValue({
      data: mockStudentDetail,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useStudentQrCode').mockReturnValue({
      data: mockQrResponse,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useCreateStudent').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useRegenerateStudentQr').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('StudentList', () => {
    it('renders populated list', () => {
      renderWithQueryClient(<TeacherStudentsPage />);
      expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('مجموعة الصف الخامس أ')).toBeInTheDocument();
    });

    it('renders empty list state', () => {
      vi.spyOn(useStudentsModule, 'useStudents').mockReturnValue({
        data: { data: [], meta: { hasMore: false } },
      } as any);
      renderWithQueryClient(<TeacherStudentsPage />);
      expect(screen.getByText(/لا يوجد طلاب مطابقين لخيارات الفلترة المحددة|لم يتم العثور على طلاب/i)).toBeInTheDocument();
    });

    it('shows create student form when add button clicked', async () => {
      renderWithQueryClient(<TeacherStudentsPage />);
      const addBtn = screen.getByText('إضافة طالب');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('تسجيل طالب جديد')).toBeInTheDocument();
      });
    });

    it('renders filters for stage, grade, groups, and academic period', () => {
      renderWithQueryClient(<TeacherStudentsPage />);
      expect(screen.getByText('جميع المراحل التعليمية')).toBeInTheDocument();
      expect(screen.getByText('جميع الصفوف الدراسية')).toBeInTheDocument();
      expect(screen.getByText('جميع المجموعات')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ابحث بالاسم، رقم الهاتف أو الكود...')).toBeInTheDocument();
    });
  });

  describe('StudentDetail', () => {
    it('renders student details', () => {
      (nextNavigation.useParams as any).mockReturnValue({ id: 'stu-1' });
      renderWithQueryClient(<StudentDetailPage />);
      
      expect(screen.getAllByText('Ahmed Ali')[0]).toBeInTheDocument();
      expect(screen.getByText('معلومات الهوية')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('shows confirmation dialog before regenerating QR', async () => {
      (nextNavigation.useParams as any).mockReturnValue({ id: 'stu-1' });
      renderWithQueryClient(<StudentDetailPage />);

      const regenBtn = screen.getByText('إعادة توليد كود الـ QR');
      fireEvent.click(regenBtn);

      await waitFor(() => {
        expect(screen.getByText(/سيؤدي هذا إلى إبطال رمز الاستجابة السريعة/i)).toBeInTheDocument();
      });
    });
  });
});
