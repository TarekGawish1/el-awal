import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StudentJoiningTimeline } from '../StudentJoiningTimeline';
import { StudentListItem } from '../../types/students.types';

const mockStudents: StudentListItem[] = [
  {
    id: 'stu-1',
    studentCode: 'STU1001',
    gradeLevel: 'الصف الثالث الثانوي',
    academicStatus: 'ACTIVE',
    createdAt: '2026-10-25T10:30:00Z',
    updatedAt: '2026-10-25T10:30:00Z',
    createdByName: 'رابط انضمام: مجموعة النخبة',
    user: {
      id: 'u-1',
      fullName: 'علي محمود حسن',
      phone: '01011112222',
      isActive: true,
    },
    groupEnrollments: [
      {
        id: 'ge-1',
        enrolledAt: '2026-10-25T10:30:00Z',
        status: 'ACTIVE',
        group: {
          id: 'grp-1',
          name: 'مجموعة النخبة',
        },
      },
    ],
    parentLinks: [
      {
        parent: {
          user: {
            id: 'p-1',
            fullName: 'محمود حسن',
            phone: '01033334444',
            isActive: true,
          },
        },
      },
    ],
  },
  {
    id: 'stu-2',
    studentCode: 'STU1002',
    gradeLevel: 'الصف الأول الثانوي',
    academicStatus: 'ACTIVE',
    createdAt: '2026-10-24T08:15:00Z',
    updatedAt: '2026-10-24T08:15:00Z',
    createdByName: 'المعلم أ. أحمد غريب',
    user: {
      id: 'u-2',
      fullName: 'سارة خالد عمر',
      phone: '01055556666',
      isActive: true,
    },
    groupEnrollments: [
      {
        id: 'ge-2',
        enrolledAt: '2026-10-24T08:15:00Z',
        status: 'ACTIVE',
        group: {
          id: 'grp-2',
          name: 'مجموعة الأوائل',
        },
      },
    ],
  },
];

describe('StudentJoiningTimeline Component', () => {
  it('renders student cards with joining information', () => {
    const handleSelect = vi.fn();
    render(
      <StudentJoiningTimeline
        students={mockStudents}
        isLoading={false}
        isError={false}
        onSelectStudent={handleSelect}
      />
    );

    expect(screen.getByText('علي محمود حسن')).toBeInTheDocument();
    expect(screen.getByText('سارة خالد عمر')).toBeInTheDocument();
    expect(screen.getAllByText('انضمام عبر رابط المجموعة').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/تسجيل يدوي بواسطة المعلم/)).toBeInTheDocument();
  });

  it('filters students by search input', () => {
    const handleSelect = vi.fn();
    render(
      <StudentJoiningTimeline
        students={mockStudents}
        isLoading={false}
        isError={false}
        onSelectStudent={handleSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/بحث في سجل الانضمام/);
    fireEvent.change(searchInput, { target: { value: 'علي محمود' } });

    expect(screen.getByText('علي محمود حسن')).toBeInTheDocument();
    expect(screen.queryByText('سارة خالد عمر')).not.toBeInTheDocument();
  });

  it('triggers onSelectStudent when clicking details button', () => {
    const handleSelect = vi.fn();
    render(
      <StudentJoiningTimeline
        students={mockStudents}
        isLoading={false}
        isError={false}
        onSelectStudent={handleSelect}
      />
    );

    const detailsButtons = screen.getAllByText('التفاصيل');
    fireEvent.click(detailsButtons[0]);

    expect(handleSelect).toHaveBeenCalledWith('stu-1');
  });

  it('renders with standalone useStudents query with limit 500 when students prop is omitted', async () => {
    const handleSelect = vi.fn();
    const hundredEightStudents = Array.from({ length: 108 }, (_, idx) => ({
      id: `stu-${idx + 1}`,
      studentCode: `STU202600${String(idx + 1).padStart(3, '0')}`,
      gradeLevel: 'الصف الأول الإعدادي',
      academicStatus: 'ACTIVE' as const,
      createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - idx * 3600000).toISOString(),
      createdByName: idx < 100 ? 'رابط انضمام: سنتر العدلية' : 'المعلم أ. أحمد غريب',
      user: {
        id: `u-${idx + 1}`,
        fullName: `طالب رقم ${idx + 1}`,
        phone: `01000000${String(idx + 1).padStart(3, '0')}`,
        isActive: true,
      },
    }));

    const queryClient = new (await import('@tanstack/react-query')).QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const useStudentsModule = await import('../../hooks/use-students');
    const spy = vi.spyOn(useStudentsModule, 'useStudents').mockReturnValue({
      data: {
        data: hundredEightStudents,
        meta: {
          total: 108,
          hasMore: false,
          nextCursor: null,
          prevCursor: null,
          limit: 500,
        },
      },
      isLoading: false,
      isError: false,
    } as any);

    const { QueryClientProvider } = await import('@tanstack/react-query');

    render(
      <QueryClientProvider client={queryClient}>
        <StudentJoiningTimeline
          totalStudents={108}
          onSelectStudent={handleSelect}
        />
      </QueryClientProvider>
    );

    // Verify limit 500 was queried
    expect(spy).toHaveBeenCalledWith({ limit: 500 });

    // Verify full student body KPI stats
    expect(screen.getByText('108 طالب')).toBeInTheDocument();
    expect(screen.getByText('طالب رقم 1')).toBeInTheDocument();
    expect(screen.getByText('طالب رقم 108')).toBeInTheDocument();
    expect(screen.getByText('الكل (108)')).toBeInTheDocument();
    expect(screen.getByText('رابط المجموعة (100)')).toBeInTheDocument();
    expect(screen.getByText('تسجيل يدوي (8)')).toBeInTheDocument();

    spy.mockRestore();
  });
});

