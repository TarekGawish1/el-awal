import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StudentRegistrationForm } from '../components/StudentRegistrationForm';
import * as useStudentRegistrationModule from '../hooks/useStudentRegistration';

function mockHook(overrides: Partial<ReturnType<typeof useStudentRegistrationModule.useStudentRegistration>> = {}) {
  const base: ReturnType<typeof useStudentRegistrationModule.useStudentRegistration> = {
    verifiedStudent: null,
    isVerifying: false,
    verifyError: null,
    verifyStudent: vi.fn(),
    resetVerifyError: vi.fn(),
    isRegistering: false,
    isRegistered: false,
    registerError: null,
    registerStudent: vi.fn(),
    redirectToDashboard: vi.fn(),
    resetFlow: vi.fn(),
  };

  vi.spyOn(useStudentRegistrationModule, 'useStudentRegistration').mockReturnValue({
    ...base,
    ...overrides,
  });

  return base;
}

const verifiedStudent = {
  registrationToken: 'reg-token',
  studentCode: 'STU-2026-0001',
  fullName: 'محمود أحمد علي',
  gradeLevel: 'الصف الثالث الثانوي',
};

describe('StudentRegistrationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the identification step with student code and activation code fields', () => {
    mockHook();

    render(<StudentRegistrationForm />);

    expect(screen.getByLabelText(/كود الطالب/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/كود التفعيل/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /التحقق من الحساب/i })).toBeInTheDocument();
    expect(screen.getByText(/العودة إلى تسجيل الدخول/i)).toBeInTheDocument();
  });

  it('validates empty inputs and shows client-side errors without calling the API', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fireEvent.click(screen.getByRole('button', { name: /التحقق من الحساب/i }));

    expect(await screen.findByText('يرجى إدخال كود الطالب')).toBeInTheDocument();
    expect(await screen.findByText('يرجى إدخال كود التفعيل')).toBeInTheDocument();
    expect(base.verifyStudent).not.toHaveBeenCalled();
  });

  it('rejects malformed student codes on the client', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/كود الطالب/i), { target: { value: 'كود غير صحيح $$$' } });
    fireEvent.change(screen.getByLabelText(/كود التفعيل/i), { target: { value: 'A7K2-9M4P-QX' } });
    fireEvent.click(screen.getByRole('button', { name: /التحقق من الحساب/i }));

    expect(await screen.findByText('كود الطالب غير صحيح')).toBeInTheDocument();
    expect(base.verifyStudent).not.toHaveBeenCalled();
  });

  it('submits trimmed identification data to the verification mutation', async () => {
    const base = mockHook();

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/كود الطالب/i), { target: { value: '  STU-2026-0001  ' } });
    fireEvent.change(screen.getByLabelText(/كود التفعيل/i), { target: { value: '  A7K2-9M4P-QX ' } });
    fireEvent.click(screen.getByRole('button', { name: /التحقق من الحساب/i }));

    await waitFor(() => {
      expect(base.verifyStudent).toHaveBeenCalledWith({
        studentCode: 'STU-2026-0001',
        registrationCode: 'A7K2-9M4P-QX',
      });
    });
  });

  it('shows a generic verification failure banner without a login path (anti-enumeration)', () => {
    mockHook({
      verifyError: { message: 'بيانات التحقق غير صحيحة، يرجى مراجعة كود الطالب وكود التفعيل' },
    });

    render(<StudentRegistrationForm />);

    expect(screen.getByText('تعذر التحقق من البيانات')).toBeInTheDocument();
    expect(
      screen.getByText('بيانات التحقق غير صحيحة، يرجى مراجعة كود الطالب وكود التفعيل'),
    ).toBeInTheDocument();
    // Only the standard footer link (always present), no extra recovery link inside the alert
    expect(screen.queryByText('تم إنشاء حساب لهذا الطالب مسبقاً')).not.toBeInTheDocument();
  });

  it('offers a login path when the student is already registered', () => {
    mockHook({
      verifyError: {
        message: 'تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة',
        code: 'STUDENT_ALREADY_REGISTERED',
      },
    });

    render(<StudentRegistrationForm />);

    expect(screen.getByText('تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة')).toBeInTheDocument();
    expect(screen.getAllByText(/العودة إلى تسجيل الدخول/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the credentials step after successful verification', () => {
    mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    expect(screen.getByText('محمود أحمد علي')).toBeInTheDocument();
    expect(screen.getByText(/STU-2026-0001 • الصف الثالث الثانوي/)).toBeInTheDocument();
    expect(screen.getByLabelText(/رقم الهاتف/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/تأكيد كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إنشاء الحساب/i })).toBeInTheDocument();
  });

  it('validates password mismatch before submitting registration', async () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/رقم الهاتف/i), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), { target: { value: 'Different123!' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    expect(await screen.findByText('كلمتا المرور غير متطابقتين')).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('validates short passwords before submitting registration', async () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/رقم الهاتف/i), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    expect(await screen.findByText('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل')).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('requires at least one login identifier (phone or email)', async () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    expect(
      await screen.findByText('يجب إدخال رقم هاتف أو بريد إلكتروني ليكون وسيلة تسجيل الدخول'),
    ).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('rejects invalid phone formats on the client', async () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/رقم الهاتف/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    expect(await screen.findByText('يرجى إدخال رقم هاتف مصري صحيح مثل 01012345678')).toBeInTheDocument();
    expect(base.registerStudent).not.toHaveBeenCalled();
  });

  it('submits credentials with the registration token on valid input', async () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.change(screen.getByLabelText(/رقم الهاتف/i), { target: { value: ' 01012345678 ' } });
    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/i), { target: { value: 'mahmoud@student.elawal.com' } });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    await waitFor(() => {
      expect(base.registerStudent).toHaveBeenCalledWith({
        registrationToken: 'reg-token',
        phone: '01012345678',
        email: 'mahmoud@student.elawal.com',
        password: 'Password123!',
      });
    });
  });

  it('shows registration errors from the backend (duplicate identifier)', () => {
    mockHook({
      verifiedStudent,
      registerError: {
        message: 'وسيلة تسجيل الدخول المدخلة مستخدمة بالفعل في حساب آخر',
        code: 'PHONE_ALREADY_IN_USE',
      },
    });

    render(<StudentRegistrationForm />);

    expect(screen.getByText('تعذر إنشاء الحساب')).toBeInTheDocument();
    expect(screen.getByText('وسيلة تسجيل الدخول المدخلة مستخدمة بالفعل في حساب آخر')).toBeInTheDocument();
  });

  it('shows the success state and redirects after account creation', () => {
    const base = mockHook({ isRegistered: true });

    render(<StudentRegistrationForm />);

    expect(screen.getByText('تم إنشاء حسابك بنجاح')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /الانتقال إلى لوحة التحكم/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /الانتقال إلى لوحة التحكم/i }));
    expect(base.redirectToDashboard).toHaveBeenCalled();
  });

  it('disables the verify button while verification is in progress', () => {
    mockHook({ isVerifying: true });

    render(<StudentRegistrationForm />);

    const submitBtn = screen.getByRole('button', { name: /التحقق من الحساب/i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
  });

  it('allows returning to the verification step from the credentials step', () => {
    const base = mockHook({ verifiedStudent });

    render(<StudentRegistrationForm />);

    fireEvent.click(screen.getByRole('button', { name: /العودة إلى خطوة التحقق/i }));
    expect(base.resetFlow).toHaveBeenCalled();
  });
});
