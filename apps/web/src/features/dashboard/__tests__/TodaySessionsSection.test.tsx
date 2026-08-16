import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TodaySessionsSection } from '../components/TodaySessionsSection';
import { TodaySessionItem } from '@/types/dashboard.types';

const mockSessions: TodaySessionItem[] = [
  {
    id: 'sess-1',
    groupId: 'grp-1',
    groupName: 'الصف الثالث الثانوي - مجموعة أ',
    gradeLevel: 'الصف الثالث الثانوي',
    startTime: '17:00',
    endTime: '19:00',
    roomLocation: 'قاعة 1',
    status: 'IN_PROGRESS',
    enrolledCount: 30,
    presentCount: 25,
  },
  {
    id: 'sess-2',
    groupId: 'grp-2',
    groupName: 'الصف الثاني الثانوي - مجموعة ب',
    gradeLevel: 'الصف الثاني الثانوي',
    startTime: '19:30',
    endTime: '21:30',
    roomLocation: 'قاعة 2',
    status: 'UPCOMING',
    enrolledCount: 28,
    presentCount: 0,
  },
];

describe('TodaySessionsSection Component', () => {
  it('renders empty sessions state when no sessions are scheduled', () => {
    render(<TodaySessionsSection sessions={[]} isLoading={false} />);
    expect(screen.getByText('لا توجد حصص مجدولة لليوم')).toBeInTheDocument();
  });

  it('renders active in-progress session with Start QR Roll-Call action button', () => {
    render(<TodaySessionsSection sessions={mockSessions} isLoading={false} />);

    expect(screen.getByText('الصف الثالث الثانوي - مجموعة أ')).toBeInTheDocument();
    expect(screen.getByText('جارية الآن')).toBeInTheDocument();
    expect(screen.getByText('رصد الحضور')).toBeInTheDocument();
    expect(screen.getByText(/حضور الطلاب: 25 \/ 30/i)).toBeInTheDocument();
  });

  it('renders upcoming session with open session button', () => {
    render(<TodaySessionsSection sessions={mockSessions} isLoading={false} />);

    expect(screen.getByText('الصف الثاني الثانوي - مجموعة ب')).toBeInTheDocument();
    expect(screen.getByText('قادمة')).toBeInTheDocument();
    expect(screen.getByText('فتح الحصة')).toBeInTheDocument();
  });
});
