import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudentLatestHomework } from '../components/StudentLatestHomework';
import { useStudentGroup, useStudentGroupSessions, useSubmitHomework } from '../hooks/useStudentPortal';

vi.mock('../hooks/useStudentPortal', () => ({
  useStudentGroup: vi.fn(),
  useStudentGroupSessions: vi.fn(),
  useSendHomeworkUpload: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ uploadUrl: 'https://r2/upload', fileKey: 'uploads/homework-submissions/answer.pdf', publicUrl: 'https://cdn/answer.pdf' }) })),
  useSubmitHomework: vi.fn(),
}));

const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

const session = {
  id: 'session-1',
  sessionDate: '2026-08-23T00:00:00.000Z',
  startTime: '10:00',
  topic: 'الحصة 4: قوانين نيوتن للحركة',
  location: 'القاعة الرئيسية',
  assessment: {
    id: 'assessment-1',
    title: 'واجب الحصة 4',
    description: 'حل التمارين من 1 إلى 5 صفحة 42',
    totalScore: 20,
    dueDate: FUTURE,
    submission: null,
  },
  educationalContents: [{ id: 'content-1', title: 'ملف أسئلة الواجب', fileUrl: 'https://cdn/sheet.pdf', downloadUrl: 'https://cdn/sheet.pdf' }],
};

class FakeXhr {
  upload = { onprogress: null as any, addEventListener: vi.fn() };
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn(function (this: any) { this.status = 200; this.onload?.(); });
}

describe('StudentLatestHomework card', () => {
  beforeEach(() => {
    vi.mocked(useStudentGroup).mockReturnValue({ data: { group: { name: 'مجموعة الصف الأول الثانوي (أ)' } } } as any);
    vi.mocked(useStudentGroupSessions).mockReturnValue({ data: [session], isLoading: false } as any);
    vi.mocked(useSubmitHomework).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
    (globalThis as any).XMLHttpRequest = FakeXhr;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the homework worksheet download and opens the upload modal', () => {
    render(<StudentLatestHomework />);
    expect(screen.getByText('الحصة 4: قوانين نيوتن للحركة')).toBeInTheDocument();
    expect(screen.getByText(/مجموعة الصف الأول الثانوي/)).toBeInTheDocument();
    expect(screen.getByText('تحميل ملف أسئلة الواجب')).toBeInTheDocument();
    expect(screen.getByText(/بانتظار تسليم الحل/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /رفع إجابة الواجب/i }));
    expect(screen.getAllByText('رفع إجابة الواجب').length).toBeGreaterThan(0);
  });

  it('shows the submitted badge when a submission exists', () => {
    vi.mocked(useStudentGroupSessions).mockReturnValue({
      data: [{ ...session, assessment: { ...session.assessment, submission: { status: 'SUBMITTED', submittedAt: FUTURE, attachmentUrl: 'https://cdn/answer.pdf' } } }],
      isLoading: false,
    } as any);
    render(<StudentLatestHomework />);
    expect(screen.getByText('✅ تم تسليم الحل')).toBeInTheDocument();
    expect(screen.getByText(/بانتظار مراجعة الأستاذ/)).toBeInTheDocument();
  });

  it('hides the homework once its deadline has passed', () => {
    vi.mocked(useStudentGroupSessions).mockReturnValue({
      data: [{ ...session, assessment: { ...session.assessment, dueDate: PAST } }],
      isLoading: false,
    } as any);
    render(<StudentLatestHomework />);
    expect(screen.getByText('لا يوجد واجب مرتبط بحصص مجموعتك حالياً')).toBeInTheDocument();
    expect(screen.queryByText('الحصة 4: قوانين نيوتن للحركة')).not.toBeInTheDocument();
  });

  it('offers a link to open and solve the homework from the dashboard', () => {
    render(<StudentLatestHomework />);
    const solveLink = screen.getByRole('link', { name: /حل واجب الحصة الآن/i });
    expect(solveLink).toHaveAttribute('href', '/student/assessments?id=assessment-1');
  });

  it('uploads a PDF answer and calls submit-homework with the session and file', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ submissionId: 'sub-1' });
    vi.mocked(useSubmitHomework).mockReturnValue({ mutateAsync, isPending: false } as any);
    render(<StudentLatestHomework />);
    fireEvent.click(screen.getByRole('button', { name: /رفع إجابة الواجب/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf-content'], 'answer.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);
    await screen.findByText('answer.pdf');

    fireEvent.click(screen.getAllByRole('button', { name: /رفع إجابة الواجب/i })[1]);
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      assessmentId: 'assessment-1',
      payload: {
        sessionId: 'session-1',
        fileKey: 'uploads/homework-submissions/answer.pdf',
        fileUrl: 'https://cdn/answer.pdf',
      },
    }));
  });
});
