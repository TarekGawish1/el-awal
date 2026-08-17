import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherStudentsPage from '@/app/(dashboard)/teacher/students/page';
import StudentDetailPage from '@/app/(dashboard)/teacher/students/[id]/page';
import * as useStudentsModule from '@/features/students/hooks/use-students';
import * as nextNavigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: () => ({ data: [] }),
}));

vi.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code">QR Code Mock</div>,
}));

describe('TeacherStudents', () => {
  const mockPaginatedStudents = {
    data: [
      {
        id: 'stu-1',
        studentCode: 'STU-2026-0001',
        gradeLevel: 'Grade 10',
        academicStatus: 'ACTIVE',
        createdAt: '2026-08-17',
        user: { id: 'usr-1', fullName: 'Ahmed Ali' },
        groupEnrollments: [{ group: { id: 'grp-1', name: 'Group A' } }],
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
    gradeLevel: 'Grade 10',
    qrCodeToken: 'qr_tok_123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

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
      render(<TeacherStudentsPage />);
      expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Group A')).toBeInTheDocument();
    });

    it('renders empty list state', () => {
      vi.spyOn(useStudentsModule, 'useStudents').mockReturnValue({
        data: { data: [], meta: { hasMore: false } },
      } as any);
      render(<TeacherStudentsPage />);
      expect(screen.getByText('No students found.')).toBeInTheDocument();
    });

    it('shows create student form when add button clicked', async () => {
      render(<TeacherStudentsPage />);
      const addBtn = screen.getByText('Add Student');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('Register New Student')).toBeInTheDocument();
      });
    });
  });

  describe('StudentDetail', () => {
    it('renders student details', () => {
      (nextNavigation.useParams as any).mockReturnValue({ id: 'stu-1' });
      render(<StudentDetailPage />);
      
      expect(screen.getAllByText('Ahmed Ali')[0]).toBeInTheDocument();
      expect(screen.getByText('Identity Information')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('shows confirmation dialog before regenerating QR', async () => {
      (nextNavigation.useParams as any).mockReturnValue({ id: 'stu-1' });
      render(<StudentDetailPage />);

      const regenBtn = screen.getByText('Regenerate QR Token');
      fireEvent.click(regenBtn);

      await waitFor(() => {
        expect(screen.getByText(/invalidate the current QR badge/i)).toBeInTheDocument();
      });
    });
  });
});
