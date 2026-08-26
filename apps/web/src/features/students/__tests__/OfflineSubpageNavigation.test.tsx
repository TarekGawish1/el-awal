import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentDetailPage from '@/app/(dashboard)/teacher/students/[id]/page';
import GroupDetailsPage from '@/app/(dashboard)/teacher/groups/[id]/page';
import TeacherStudentsPage from '@/app/(dashboard)/teacher/students/page';
import GroupsPage from '@/app/(dashboard)/teacher/groups/page';
import { StudentDetailsModal } from '@/features/students/components/StudentDetailsModal';
import { GroupDetailsModal } from '@/features/groups/components/GroupDetailsModal';
import * as useStudentsModule from '@/features/students/hooks/use-students';
import * as useGroupsModule from '@/features/groups/hooks/useGroups';
import * as nextNavigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  usePathname: vi.fn(() => '/teacher/students'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code">QR Code Mock</div>,
}));

describe('Offline Subpage Navigation & Resilient Hydration', () => {
  let queryClient: QueryClient;

  const mockOfflineStudent = {
    id: 'offline-stu-101',
    studentCode: 'STU-101001',
    gradeLevel: 'الصف الأول الثانوي',
    academicStage: 'SECONDARY',
    academicStatus: 'ACTIVE',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    emergencyPhone: '01012345678',
    user: {
      id: 'usr-101',
      fullName: 'عمر خالد المنشاوي',
      phone: '01012345678',
      email: 'omar@example.com',
      isActive: true,
    },
    groupEnrollments: [
      {
        group: {
          id: 'grp-secondary-1',
          name: 'مجموعة الفيزياء للثانوية',
          gradeLevel: 'الصف الأول الثانوي',
        },
      },
    ],
    parentLinks: [
      {
        parent: {
          user: {
            id: 'parent-usr-1',
            fullName: 'خالد المنشاوي',
            phone: '01198765432',
            isActive: true,
          },
        },
      },
    ],
  };

  const mockOfflineGroup = {
    id: 'grp-secondary-1',
    name: 'مجموعة الفيزياء للثانوية',
    gradeLevel: 'الصف الأول الثانوي',
    academicYear: '2026-2027',
    academicTerm: 'FIRST_TERM',
    description: 'مجموعة الشرح والتدريبات المكثفة',
    monthlyFee: 350,
    maxCapacity: 40,
    status: 'ACTIVE',
    schedules: [
      {
        dayOfWeek: 1,
        startTime: '16:00',
        endTime: '18:00',
        location: 'قاعة الأمل - الدور الثاني',
      },
    ],
    _count: {
      enrollments: 25,
      schedules: 1,
    },
  };

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
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

    (nextNavigation.usePathname as any).mockReturnValue('/teacher/students');
    (nextNavigation.useParams as any).mockReturnValue({ id: 'offline-stu-101' });

    vi.spyOn(useStudentsModule, 'useStudents').mockReturnValue({
      data: {
        data: [mockOfflineStudent],
        meta: { total: 1, hasMore: false, limit: 10 },
      } as any,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useStudentsModule, 'useStudent').mockReturnValue({
      data: mockOfflineStudent as any,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(useStudentsModule, 'useStudentQrCode').mockReturnValue({
      data: {
        studentId: 'offline-stu-101',
        studentCode: 'STU-101001',
        fullName: 'عمر خالد المنشاوي',
        gradeLevel: 'الصف الأول الثانوي',
        qrCodeToken: 'offline-stu-101',
      },
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useGroupsModule, 'useGroups').mockReturnValue({
      data: [mockOfflineGroup] as any,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useGroupsModule, 'useGroup').mockReturnValue({
      data: mockOfflineGroup as any,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(useGroupsModule, 'useGroupStudents').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useGroupsModule, 'useDeleteGroup').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('renders student detail subpage with params from useParams when offline', () => {
    (nextNavigation.useParams as any).mockReturnValue({ id: 'offline-stu-101' });

    renderWithClient(<StudentDetailPage params={{ id: 'offline-stu-101' }} />);

    expect(screen.getAllByText('عمر خالد المنشاوي')[0]).toBeInTheDocument();
    expect(screen.getAllByText('STU-101001')[0]).toBeInTheDocument();
    expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    expect(screen.getByText('خالد المنشاوي')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });

  it('renders group detail subpage with params from useParams when offline', () => {
    (nextNavigation.useParams as any).mockReturnValue({ id: 'grp-secondary-1' });

    renderWithClient(<GroupDetailsPage params={{ id: 'grp-secondary-1' }} />);

    expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
    expect(screen.getByText(/قاعة الأمل - الدور الثاني/)).toBeInTheDocument();
  });

  it('renders graceful entity-not-found state without throwing or redirecting on unknown student ID', () => {
    (nextNavigation.useParams as any).mockReturnValue({ id: 'unknown-id' });
    vi.spyOn(useStudentsModule, 'useStudent').mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithClient(<StudentDetailPage params={{ id: 'unknown-id' }} />);

    expect(screen.getByText('لم يتم العثور على سجل الطالب')).toBeInTheDocument();
    expect(screen.getByText('العودة لسجل الطلاب')).toBeInTheDocument();
  });

  it('renders graceful entity-not-found state on unknown group ID', () => {
    (nextNavigation.useParams as any).mockReturnValue({ id: 'unknown-group-id' });
    vi.spyOn(useGroupsModule, 'useGroup').mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithClient(<GroupDetailsPage params={{ id: 'unknown-group-id' }} />);

    expect(screen.getByText('لم يتم العثور على المجموعة الدراسية')).toBeInTheDocument();
    expect(screen.getByText('العودة لقائمة المجموعات')).toBeInTheDocument();
  });

  it('renders StudentDetailsModal for quick offline view without page navigation', () => {
    const handleClose = vi.fn();
    renderWithClient(
      <StudentDetailsModal
        studentId="offline-stu-101"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getAllByText('عمر خالد المنشاوي')[0]).toBeInTheDocument();
    expect(screen.getAllByText('STU-101001')[0]).toBeInTheDocument();
    expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    expect(screen.getByText('خالد المنشاوي')).toBeInTheDocument();
    expect(screen.getByText('عرض الصفحة الكاملة')).toBeInTheDocument();
  });

  it('renders GroupDetailsModal for quick offline group view without page navigation', () => {
    const handleClose = vi.fn();
    renderWithClient(
      <GroupDetailsModal
        groupId="grp-secondary-1"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });

  it('renders subpath student detail on offline reload of /teacher/students/[id]', () => {
    (nextNavigation.usePathname as any).mockReturnValue('/teacher/students/offline-stu-101');
    (nextNavigation.useParams as any).mockReturnValue({ id: 'offline-stu-101' });

    renderWithClient(<TeacherStudentsPage />);

    expect(screen.getAllByText('عمر خالد المنشاوي')[0]).toBeInTheDocument();
    expect(screen.getAllByText('STU-101001')[0]).toBeInTheDocument();
    expect(screen.getByText('معلومات الهوية')).toBeInTheDocument();
  });

  it('renders subpath group detail on offline reload of /teacher/groups/[id]', () => {
    (nextNavigation.usePathname as any).mockReturnValue('/teacher/groups/grp-secondary-1');
    (nextNavigation.useParams as any).mockReturnValue({ id: 'grp-secondary-1' });

    renderWithClient(<GroupsPage />);

    expect(screen.getByText('مجموعة الفيزياء للثانوية')).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });
});
