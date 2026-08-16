import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AttentionSection } from '../components/AttentionSection';
import { AtRiskStudentAlert, PendingGradingAlert } from '@/types/dashboard.types';

const mockAtRisk: AtRiskStudentAlert[] = [
  {
    id: 'alt-1',
    studentId: 'stu-101',
    studentName: 'محمود أحمد علي',
    groupId: 'grp-1',
    groupName: 'مجموعة الأحد والأربعاء',
    consecutiveAbsences: 2,
    lastAttendedDate: '2026-08-10',
  },
];

const mockPendingGrading: PendingGradingAlert[] = [
  {
    assessmentId: 'asm-201',
    assessmentTitle: 'امتحان نصوص وبلاغة',
    groupName: 'مجموعة الصف الثالث',
    pendingCount: 15,
    daysPending: 3,
  },
];

describe('AttentionSection Component', () => {
  it('renders all clear state when there are zero alerts', () => {
    render(<AttentionSection atRiskStudents={[]} pendingGrading={[]} isLoading={false} />);
    expect(screen.getByText('لا توجد تنبيهات معلقة حالياً')).toBeInTheDocument();
    expect(screen.getByText('جميع الأمور مستقرة ومحدثة')).toBeInTheDocument();
  });

  it('renders consecutive absences alert with actionable CTA', () => {
    render(<AttentionSection atRiskStudents={mockAtRisk} pendingGrading={[]} isLoading={false} />);

    expect(screen.getByText('محمود أحمد علي')).toBeInTheDocument();
    expect(screen.getByText(/غياب 2 حصص متتالية/i)).toBeInTheDocument();
    expect(screen.getByText('متابعة الطالب')).toBeInTheDocument();
  });

  it('renders pending grading alert with direct link to submissions review', () => {
    render(<AttentionSection atRiskStudents={[]} pendingGrading={mockPendingGrading} isLoading={false} />);

    expect(screen.getByText('امتحان نصوص وبلاغة')).toBeInTheDocument();
    expect(screen.getByText(/15 إجابات معلقة/i)).toBeInTheDocument();
    expect(screen.getByText('تصحيح الإجابات')).toBeInTheDocument();
  });
});
