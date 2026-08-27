import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from '@/app/(dashboard)/layout';
import * as useAuthModule from '../hooks/useAuth';

const mockReplace = vi.fn();
const mockPush = vi.fn();

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

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
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({ LogoutConfirmation: <></>, 
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

    renderWithProviders(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('جاري التحقق من بيانات الدخول...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login with redirect query param', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({ LogoutConfirmation: <></>, 
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

    renderWithProviders(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fteacher%2Fdashboard');
    expect(screen.getByText('جاري التوجيه إلى تسجيل الدخول...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders protected layout and children when user is authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({ LogoutConfirmation: <></>, 
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

    renderWithProviders(
      <DashboardLayout>
        <div>Protected Dashboard Content</div>
      </DashboardLayout>
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('أ. طارق عبد الله')).toBeInTheDocument();
    expect(screen.getByText('مدرس معتمد')).toBeInTheDocument();
  });
});
