import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StudentRegistrationForm } from '../components/StudentRegistrationForm';
import * as useStudentRegistrationModule from '../hooks/useStudentRegistration';

function mockHook(overrides: Partial<ReturnType<typeof useStudentRegistrationModule.useStudentRegistration>> = {}) {
  const base: ReturnType<typeof useStudentRegistrationModule.useStudentRegistration> = {
    credentials: null,
    isRegistering: false,
    isRegistered: false,
    registerError: null,
    registerStudent: vi.fn(),
    resetError: vi.fn(),
    redirectToDashboard: vi.fn(),
  };

  vi.spyOn(useStudentRegistrationModule, 'useStudentRegistration').mockReturnValue({
    ...base,
    ...overrides,
  });

  return base;
}

const credentials = {
  studentCode: 'STU-2026-00482',
  studentPhone: '01012345678',
  studentPassword: 'Ab3$kL9mQwZx',
  parentPhone: '01098765432',
  parentPassword: 'Xy7@nR2pVcTq',
  parentIsNew: true,
};

function selectCenterMode() {
  fireEvent.click(screen.getByText('طالب سنتر'));
}

function selectOption(labelText: RegExp, optionText: string) {
  const trigger = screen.getByLabelText(labelText);
  fireEvent.click(trigger);
  const optionButton = screen.getByRole('button', { name: optionText });
  fireEvent.click(optionButton);
}

function fillValidInfo() {
  selectCenterMode();
  fireEvent.change(screen.getByLabelText(/الاسم بالكامل/i), { target: { value: 'محمود أحمد علي' } });
  fireEvent.change(screen.getByLabelText(/رقم هاتف الطالب/i), { target: { value: '01012345678' } });
  fireEvent.change(screen.getByLabelText(/رقم هاتف ولي الأمر/i), { target: { value: '01098765432' } });
  selectOption(/المرحلة الدراسية/i, 'المرحلة الثانوية');
  selectOption(/الصف الدراسي/i, 'الصف الثالث الثانوي');
}

describe('StudentRegistrationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the attendance mode selection step initially', () => {
    mockHook();

    render(<StudentRegistrationForm />);

    expect(screen.getByText('طالب سنتر')).toBeInTheDocument();
    expect(screen.getByText('أونلاين فقط')).toBeInTheDocument();
    expect(screen.getByText(/العودة إلى تسجيل الدخول/i)).toBeInTheDocument();
  });

  it('renders the student information step with all required fields after selecting mode', () => {
    mockHook();

    render(<StudentRegistrationForm />);
    selectCenterMode();

    expect(screen.getByLabelText(/الاسم بالكامل/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رقم هاتف الطالب/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رقم هاتف ولي الأمر/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/المرحلة الدراسية/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/الصف الدراسي/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /متابعة/i })).toBeInTheDocument();
  });

  it('validates empty fields and shows client-side errors without submitting', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);
    selectCenterMode();

    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    expect(await screen.findByText('يرجى إدخال الاسم بالكامل (3 أحرف على الأقل)')).toBeInTheDocument();
    expect(await screen.findByText('يرجى إدخال رقم هاتف الطالب')).toBeInTheDocument();
    expect(await screen.findByText('يرجى إدخال رقم هاتف ولي الأمر')).toBeInTheDocument();
    expect(await screen.findByText('يرجى اختيار المرحلة الدراسية')).toBeInTheDocument();
    expect(await screen.findByText('يرجى اختيار الصف الدراسي')).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('rejects an invalid student phone number', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fillValidInfo();
    fireEvent.change(screen.getByLabelText(/رقم هاتف الطالب/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    expect(await screen.findByText('رقم الهاتف غير صحيح')).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('rejects when parent and student phones are identical', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fillValidInfo();
    fireEvent.change(screen.getByLabelText(/رقم هاتف ولي الأمر/i), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    expect(
      await screen.findByText('رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب'),
    ).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('advances to the review step after valid input', async () => {
    mockHook();

    render(<StudentRegistrationForm />);

    fillValidInfo();
    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    expect(await screen.findByText('تأكد من صحة البيانات قبل إنشاء الحساب')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إنشاء الحساب/i })).toBeInTheDocument();
  });

  it('submits the registration payload from the review step', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fillValidInfo();
    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    const createBtn = await screen.findByRole('button', { name: /إنشاء الحساب/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(base.registerStudent).toHaveBeenCalledWith({
        fullName: 'محمود أحمد علي',
        studentPhone: '01012345678',
        parentPhone: '01098765432',
        academicStage: 'SECONDARY',
        gradeLevel: 'الصف الثالث الثانوي',
        attendanceMode: 'CENTER',
      });
    });
  });

  it('shows the registration error and a login path when the phone is already registered', async () => {
    mockHook({
      registerError: { message: 'رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة', code: 'PHONE_ALREADY_REGISTERED' },
    });

    render(<StudentRegistrationForm />);

    fillValidInfo();
    fireEvent.click(screen.getByRole('button', { name: /متابعة/i }));

    expect(await screen.findByText('تعذر إنشاء الحساب')).toBeInTheDocument();
    expect(screen.getByText('رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة')).toBeInTheDocument();
    expect(screen.getAllByText(/العودة إلى تسجيل الدخول/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the one-time credentials success screen with copy actions', () => {
    mockHook({ isRegistered: true, credentials });

    render(<StudentRegistrationForm />);

    expect(screen.getByText(/تم إنشاء الحساب بنجاح/i)).toBeInTheDocument();
    expect(screen.getByText('STU-2026-00482')).toBeInTheDocument();
    expect(screen.getByText('Ab3$kL9mQwZx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /نسخ بيانات حساب الطالب/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اختار المجموعة الدراسية/i })).toBeInTheDocument();
  });

  it('renders student credentials correctly on success', () => {
    mockHook({
      isRegistered: true,
      credentials: { ...credentials, parentIsNew: false, parentPassword: null },
    });

    render(<StudentRegistrationForm />);

    expect(screen.getByText(/تم إنشاء الحساب بنجاح/i)).toBeInTheDocument();
    expect(screen.getByText('STU-2026-00482')).toBeInTheDocument();
  });

  it('redirects to the dashboard from the success screen', () => {
    const base = mockHook({ isRegistered: true, credentials });

    render(<StudentRegistrationForm />);

    fireEvent.click(screen.getByRole('button', { name: /اختار المجموعة الدراسية/i }));
    expect(base.redirectToDashboard).toHaveBeenCalled();
  });

  it('disables the primary action while registration is in progress (prevents duplicate submission)', () => {
    mockHook({ isRegistering: true });

    render(<StudentRegistrationForm />);
    selectCenterMode();

    const submitBtn = screen.getByRole('button', { name: /متابعة/i });
    expect(submitBtn).toBeDisabled();
  });
});
