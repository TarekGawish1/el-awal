import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentPasswordModal } from '../components/StudentPasswordModal';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const resetPasswordMock = vi.fn();
let mockCredentials = {
  studentId: 'student-123',
  studentName: 'محمود أحمد علي',
  studentCode: 'STU-2026-001',
  studentPhone: '01012345678',
  parentName: 'أحمد علي',
  parentPhone: '01098765432',
  tempAccessPin: 'r54dpf',
  pinExpiresAt: '2026-12-31T00:00:00.000Z',
  isPinActive: true,
};

vi.mock('../hooks/use-students', () => ({
  useStudentCredentials: () => ({
    data: mockCredentials,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useResetStudentPassword: () => ({
    mutate: resetPasswordMock,
    isPending: false,
  }),
}));

describe('StudentPasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student credentials and active temporary PIN', () => {
    render(
      <StudentPasswordModal
        studentId="student-123"
        studentName="محمود أحمد علي"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('كلمة المرور وبيانات الدخول')).toBeInTheDocument();
    expect(screen.getByText('STU-2026-001')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByText('01098765432')).toBeInTheDocument();
    expect(screen.getByText('r54dpf')).toBeInTheDocument();
    expect(screen.getByText('نشط وصالح')).toBeInTheDocument();
  });

  it('populates preset password when clicking تعيين: 123456', () => {
    render(
      <StudentPasswordModal
        studentId="student-123"
        studentName="محمود أحمد علي"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const presetBtn = screen.getByRole('button', { name: 'تعيين: 123456' });
    fireEvent.click(presetBtn);

    const input = screen.getByPlaceholderText('مثال: 123456 أو كلمة مخصصة...') as HTMLInputElement;
    expect(input.value).toBe('123456');
  });

  it('submits password reset mutation with specified payload', () => {
    render(
      <StudentPasswordModal
        studentId="student-123"
        studentName="محمود أحمد علي"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('مثال: 123456 أو كلمة مخصصة...');
    fireEvent.change(input, { target: { value: 'secret99' } });

    const submitBtn = screen.getByRole('button', { name: /حفظ وتحديث كلمة المرور/i });
    fireEvent.click(submitBtn);

    expect(resetPasswordMock).toHaveBeenCalledWith(
      {
        studentId: 'student-123',
        payload: {
          newPassword: 'secret99',
          sendWhatsApp: true,
        },
      },
      expect.any(Object),
    );
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <StudentPasswordModal
        studentId="student-123"
        studentName="محمود أحمد علي"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
