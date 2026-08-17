import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginForm } from '../components/LoginForm';
import * as useAuthModule from '../hooks/useAuth';

describe('LoginForm Component', () => {
  const mockLogin = vi.fn();
  const mockResetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required login form fields and submit button', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    expect(screen.getByLabelText(/البريد الإلكتروني أو رقم الهاتف/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
  });

  it('validates empty inputs and displays client-side validation errors', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل')).toBeInTheDocument();
    expect(await screen.findByText('يرجى إدخال كلمة المرور')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('validates minimum password length requirement', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    const identifierInput = screen.getByLabelText(/البريد الإلكتروني أو رقم الهاتف/i);
    const passwordInput = screen.getByLabelText(/^كلمة المرور/i);

    fireEvent.change(identifierInput, { target: { value: 'teacher@elawal.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('toggles password visibility when clicking eye button', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^كلمة المرور/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText('إظهار كلمة المرور');
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByLabelText('إخفاء كلمة المرور');
    fireEvent.click(hideBtn);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits valid credentials to auth login mutation', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    const identifierInput = screen.getByLabelText(/البريد الإلكتروني أو رقم الهاتف/i);
    const passwordInput = screen.getByLabelText(/^كلمة المرور/i);

    fireEvent.change(identifierInput, { target: { value: 'teacher@elawal.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        {
          identifier: 'teacher@elawal.com',
          password: 'Password123!',
        },
        expect.any(Object)
      );
    });
  });

  it('renders loading spinner and disables submit button during login', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: true,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول/i });
    expect(submitBtn).toBeDisabled();
  });

  it('renders error alert banner when authentication fails', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: mockLogin,
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل',
      rawError: new Error('401'),
      resetError: mockResetError,
      logout: vi.fn(),
    });

    render(<LoginForm />);

    expect(screen.getByText('تعذر تسجيل الدخول')).toBeInTheDocument();
    expect(screen.getByText('بيانات الدخول غير صحيحة أو الحساب غير مفعّل')).toBeInTheDocument();
  });
});
