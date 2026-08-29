import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupRegistrationForm } from '../components/GroupRegistrationForm';

const registerStudentMock = vi.fn();
const redirectToDashboardMock = vi.fn();

vi.mock('../hooks/useGroupRegistration', () => ({
  useGroupInvite: vi.fn(() => ({
    data: {
      groupId: 'group-1',
      groupName: 'مجموعة الثانوية العامة أ',
      gradeLevel: 'الصف الثالث الثانوي',
      stage: 'المرحلة الثانوية',
      teacherName: 'الأستاذ أحمد',
      monthlyFee: 250,
      isValid: true,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useGroupRegistration: vi.fn(() => ({
    isRegistering: false,
    isRegistered: false,
    registerError: null,
    registerStudent: registerStudentMock,
    resetError: vi.fn(),
    redirectToDashboard: redirectToDashboardMock,
  })),
}));

const FIELD_LABELS = {
  fullName: /اسم الطالب رباعي/,
  phone: /رقم هاتف الطالب/,
  parentName: /اسم ولي الأمر/,
  parentPhone: /رقم هاتف ولي الأمر/,
  password: 'كلمة المرور*',
  confirmPassword: 'تأكيد كلمة المرور*',
} as const;

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.fullName), {
    target: { value: 'محمود أحمد علي مصطفى' },
  });
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.phone), {
    target: { value: '01012345678' },
  });
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.parentName), {
    target: { value: 'محمد أحمد علي' },
  });
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.parentPhone), {
    target: { value: '01098765432' },
  });
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.password), {
    target: { value: 'Str0ngPass!' },
  });
  fireEvent.change(screen.getByLabelText(FIELD_LABELS.confirmPassword), {
    target: { value: 'Str0ngPass!' },
  });
};

describe('GroupRegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () => render(<GroupRegistrationForm token="test-token-123" />);

  it('renders the group invite header card with group, grade, stage, and teacher', () => {
    renderForm();

    expect(screen.getByTestId('invite-group-name')).toHaveTextContent('مجموعة الثانوية العامة أ');
    expect(screen.getByTestId('group-invite-header')).toHaveTextContent('الصف الثالث الثانوي');
    expect(screen.getByTestId('group-invite-header')).toHaveTextContent('المرحلة الثانوية');
    expect(screen.getByTestId('invite-teacher-name')).toHaveTextContent('الأستاذ أحمد');
  });

  it('shows validation errors for all required student and parent fields when submitted empty', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(screen.getByText('يرجى إدخال اسم الطالب رباعياً (3 أحرف على الأقل)')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال رقم هاتف الطالب')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال اسم ولي الأمر')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال رقم هاتف ولي الأمر')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال كلمة المرور')).toBeInTheDocument();
    expect(screen.getByText('يرجى تأكيد كلمة المرور')).toBeInTheDocument();

    expect(registerStudentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid Egyptian phone numbers', () => {
    renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.phone), {
      target: { value: '012345' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(screen.getByText('رقم الهاتف غير صحيح')).toBeInTheDocument();
    expect(registerStudentMock).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation', () => {
    renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.confirmPassword), {
      target: { value: 'DifferentPass1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(screen.getByText('كلمتا المرور غير متطابقتين')).toBeInTheDocument();
    expect(registerStudentMock).not.toHaveBeenCalled();
  });

  it('rejects a parent phone identical to the student phone', () => {
    renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.parentPhone), {
      target: { value: '01012345678' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(
      screen.getByText('رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب'),
    ).toBeInTheDocument();
    expect(registerStudentMock).not.toHaveBeenCalled();
  });

  it('submits the registration payload with normalized data when the form is valid', () => {
    renderForm();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(registerStudentMock).toHaveBeenCalledTimes(1);
    expect(registerStudentMock).toHaveBeenCalledWith({
      fullName: 'محمود أحمد علي مصطفى',
      phone: '01012345678',
      parentName: 'محمد أحمد علي',
      parentPhone: '01098765432',
      password: 'Str0ngPass!',
    });
  });

  it('rejects passwords shorter than 8 characters', () => {
    renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.password), {
      target: { value: 'short1!' },
    });
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.confirmPassword), {
      target: { value: 'short1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'التسجيل والانضمام للمجموعة' }));

    expect(screen.getByText('كلمة المرور يجب أن تكون 8 أحرف على الأقل')).toBeInTheDocument();
    expect(registerStudentMock).not.toHaveBeenCalled();
  });
});
