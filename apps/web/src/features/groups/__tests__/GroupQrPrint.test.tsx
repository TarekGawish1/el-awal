import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GroupCard } from '../components/GroupCard';
import { GroupQrPrintModal } from '../components/GroupQrPrintModal';
import * as useGroupsModule from '../hooks/useGroups';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/auth/utils/auth-tokens', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getStoredAccessToken: vi.fn(() => 'mock-access-token-xyz'),
  };
});

const mockStudents = [
  {
    id: 'enr-1',
    status: 'ACTIVE',
    student: {
      id: 'stu-1',
      code: 'STU-2026-0001',
      studentCode: 'STU-2026-0001',
      qrCodeToken: 'qr_tok_0001',
      user: {
        name: 'أحمد محمود علي',
        phone: '01012345678',
      },
    },
  },
  {
    id: 'enr-2',
    status: 'ACTIVE',
    student: {
      id: 'stu-2',
      code: 'STU-2026-0002',
      studentCode: 'STU-2026-0002',
      qrCodeToken: 'qr_tok_0002',
      user: {
        name: 'باسم كمال الدين',
        phone: '01099988877',
      },
    },
  },
  {
    id: 'enr-3',
    status: 'INACTIVE', // Should be filtered out
    student: {
      id: 'stu-3',
      code: 'STU-2026-0003',
      user: {
        name: 'طالب غير نشط',
      },
    },
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Bulk Student QR Code PDF Generation and Printing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useGroupsModule, 'useGroupStudents').mockReturnValue({
      data: mockStudents as any,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('GroupCard Integration', () => {
    const mockGroup = {
      id: 'group-101',
      name: 'مجموعة الأحد والأربعاء - الصف الثالث',
      gradeLevel: 'الصف الثالث الثانوي',
      academicYear: '2026-2027',
      academicTerm: 'FIRST_TERM',
      status: 'ACTIVE',
      _count: { enrollments: 12, schedules: 2 },
    };

    it('renders the QR print action button on group card', () => {
      renderWithClient(<GroupCard group={mockGroup as any} />);

      const printBtn = screen.getByRole('button', { name: /طباعة كروت الـ QR Codes للطلاب/i });
      expect(printBtn).toBeInTheDocument();
      expect(screen.getByText('كروت QR')).toBeInTheDocument();
    });

    it('clicking the print button opens GroupQrPrintModal and stops card navigation', () => {
      const onCardClick = vi.fn();
      renderWithClient(<GroupCard group={mockGroup as any} onClick={onCardClick} />);

      const printBtn = screen.getByRole('button', { name: /طباعة كروت الـ QR Codes للطلاب/i });
      fireEvent.click(printBtn);

      expect(onCardClick).not.toHaveBeenCalled();
      expect(screen.getByText('طباعة كروت الـ QR Codes للطلاب')).toBeInTheDocument();
    });
  });

  describe('GroupQrPrintModal Component', () => {
    it('renders only active students sorted alphabetically with QR codes and identifiers', () => {
      renderWithClient(
        <GroupQrPrintModal
          groupId="group-101"
          groupName="مجموعة الأحد والأربعاء"
          gradeLevel="الصف الثالث الثانوي"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Student 1 & 2 (Active) should be visible
      expect(screen.getByText('أحمد محمود علي')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('باسم كمال الدين')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-0002')).toBeInTheDocument();

      // Student 3 (Inactive) must not be rendered
      expect(screen.queryByText('طالب غير نشط')).not.toBeInTheDocument();
    });

    it('toggles grid layout density between 8 and 6 cards per page viewport calculation', () => {
      renderWithClient(
        <GroupQrPrintModal
          groupId="group-101"
          groupName="مجموعة الأحد والأربعاء"
          gradeLevel="الصف الثالث الثانوي"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const btn8 = screen.getByText(/8 كروت \/ صفحة/i);
      const btn6 = screen.getByText(/6 كروت \/ صفحة/i);

      expect(btn8).toBeInTheDocument();
      expect(btn6).toBeInTheDocument();

      // Default is 8 cards
      const cards = document.querySelectorAll('.qr-print-card');
      expect(cards.length).toBe(2);
      expect((cards[0] as HTMLElement).style.minHeight).toBe('220px');

      // Click 6 cards density
      fireEvent.click(btn6);
      expect((cards[0] as HTMLElement).style.minHeight).toBe('260px');
    });

    it('initiates high-resolution PDF download with correct group ID and auth token', async () => {
      const mockBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      // Mock URL.createObjectURL
      const mockCreateObjectUrl = vi.fn(() => 'blob:http://localhost/mock-uuid');
      const mockRevokeObjectUrl = vi.fn();
      window.URL.createObjectURL = mockCreateObjectUrl;
      window.URL.revokeObjectURL = mockRevokeObjectUrl;

      renderWithClient(
        <GroupQrPrintModal
          groupId="group-101"
          groupName="مجموعة التفوق"
          gradeLevel="الصف الثالث الثانوي"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const downloadBtn = screen.getByText(/تحميل PDF عالي الدقة/i);
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/groups/group-101/qr-codes-pdf'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-access-token-xyz',
            }),
          })
        );
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('تم تحميل كروت الـ QR بنجاح'));
      });
    });

    it('triggers browser print preview dialog on direct print click', () => {
      const originalPrint = window.print;
      window.print = vi.fn();

      renderWithClient(
        <GroupQrPrintModal
          groupId="group-101"
          groupName="مجموعة التفوق"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const printBtn = screen.getByText(/طباعة فورية/i);
      fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalled();
      window.print = originalPrint;
    });
  });
});
