import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LoginContainer } from '../components/LoginContainer';
import * as useAuthModule from '../hooks/useAuth';

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => '/login',
}));

describe('LoginContainer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding header, titles, and login form for unauthenticated visitor', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      login: vi.fn(),
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginContainer />);

    expect(screen.getByText('منصة الأول التعليمية')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني أو رقم الهاتف/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'دخول ولي الأمر' })).toHaveAttribute('href', '/parent-access');
    expect(screen.getByRole('link', { name: 'إنشاء حساب طالب' })).toHaveAttribute('href', '/register/student');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects already authenticated TEACHER user away from /login to /teacher/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-1',
        fullName: 'أ. طارق عبد الله',
        role: 'TEACHER',
      },
      isAuthenticated: true,
      isInitialized: true,
      login: vi.fn(),
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginContainer />);

    expect(mockReplace).toHaveBeenCalledWith('/teacher/dashboard');
  });

  it('redirects already authenticated SECRETARIAT user to /secretariat/dashboard', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-2',
        fullName: 'سارة إبراهيم',
        role: 'SECRETARIAT',
      },
      isAuthenticated: true,
      isInitialized: true,
      login: vi.fn(),
      loginAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      rawError: null,
      resetError: vi.fn(),
      logout: vi.fn(),
    });

    render(<LoginContainer />);

    expect(mockReplace).toHaveBeenCalledWith('/secretariat/dashboard');
  });
});
