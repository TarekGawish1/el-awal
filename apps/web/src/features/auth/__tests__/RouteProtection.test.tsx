import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import * as useAuthModule from '../hooks/useAuth';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => '/teacher/dashboard',
}));

describe('Dashboard Route Protection & Authentication Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while auth state is initializing', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
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

    render(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('جاري التحقق من بيانات الدخول...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login with redirect query param', () => {
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

    render(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fteacher%2Fdashboard');
    expect(screen.getByText('جاري التوجيه إلى تسجيل الدخول...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders protected layout and children when user is authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-1',
        fullName: 'أ. طارق عبد الله',
        email: 'teacher@elawal.com',
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

    render(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('أ. طارق عبد الله')).toBeInTheDocument();
    expect(screen.getByText('teacher@elawal.com')).toBeInTheDocument();
  });
});
