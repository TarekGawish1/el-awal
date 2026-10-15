import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ParentAccessForm } from '../components/ParentAccessForm';
import * as parentAccessHook from '../hooks/useParentAccess';
import * as authHook from '../hooks/useAuth';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../hooks/useParentAccess', () => ({
  useParentAccess: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
  normalizeAuthErrorMessage: vi.fn((err: any) => err?.message || 'خطأ في التحقق'),
}));

describe('ParentAccessForm', () => {
  const mockAccessParent = vi.fn();
  const mockLoginWithOtp = vi.fn();
  const mockRequestLoginOtp = vi.fn();
  const mockResetOtpError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(parentAccessHook, 'useParentAccess').mockReturnValue({
      accessParent: mockAccessParent,
      isLoading: false,
      isError: false,
      error: null,
      resetError: vi.fn(),
    });

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      loginWithOtp: mockLoginWithOtp,
      loginWithOtpAsync: vi.fn(),
      isOtpLoading: false,
      isOtpSuccess: false,
      isOtpError: false,
      otpError: null,
      resetOtpError: mockResetOtpError,
      requestLoginOtp: mockRequestLoginOtp,
      login: vi.fn(),
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: vi.fn(),
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      LogoutConfirmation: <></>,
    });
  });

  it('renders a secure parent access form with identifier and password inputs', () => {
    render(<ParentAccessForm />);

    expect(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دخول ولي الأمر' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^كلمة المرور$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /رمز الواتساب/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /نسيت كلمة المرور؟/i })).toBeInTheDocument();
  });

  it('validates the student phone number and password before submitting', () => {
    render(<ParentAccessForm />);

    fireEvent.click(screen.getByRole('button', { name: 'دخول ولي الأمر' }));
    expect(screen.getByText('يرجى إدخال رقم الهاتف أو كود الطالب')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال كلمة المرور')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secretpass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'دخول ولي الأمر' }));

    expect(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i)).toHaveValue('01012345678');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('secretpass123');
    expect(mockAccessParent).toHaveBeenCalledWith({
      studentPhone: '01012345678',
      password: 'secretpass123',
    });
  });

  it('shows the server error when credentials are invalid', () => {
    vi.spyOn(parentAccessHook, 'useParentAccess').mockReturnValue({
      accessParent: mockAccessParent,
      isLoading: false,
      isError: true,
      error: 'كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور أو استخدام رابط الدخول الآمن',
      resetError: vi.fn(),
    });

    render(<ParentAccessForm />);

    expect(screen.getByText('تعذر الدخول')).toBeInTheDocument();
    expect(screen.getByText('كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور أو استخدام رابط الدخول الآمن')).toBeInTheDocument();
  });

  it('switches to OTP mode and requests OTP code', async () => {
    mockRequestLoginOtp.mockResolvedValueOnce({ success: true, message: 'تم إرسال الرمز', cooldownSeconds: 60 });
    render(<ParentAccessForm />);

    // Click OTP tab
    fireEvent.click(screen.getByRole('button', { name: /رمز الواتساب/i }));

    expect(screen.getByRole('button', { name: /إرسال رمز التحقق عبر واتساب/i })).toBeInTheDocument();

    // Type phone and submit
    fireEvent.change(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: /إرسال رمز التحقق عبر واتساب/i }));

    await waitFor(() => {
      expect(mockRequestLoginOtp).toHaveBeenCalledWith('01012345678', 'PARENT');
    });
  });

  it('opens Forgot Password modal when clicking "نسيت كلمة المرور؟"', () => {
    render(<ParentAccessForm />);

    fireEvent.click(screen.getByRole('button', { name: /نسيت كلمة المرور؟/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('استعادة كلمة المرور')).toBeInTheDocument();
  });
});
