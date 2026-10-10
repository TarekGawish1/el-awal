import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationBell from './NotificationBell';
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkRead } from '@/hooks/useNotifications';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithClient = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useUnreadCount: vi.fn(),
  useMarkRead: vi.fn(),
  useMarkAllRead: vi.fn(),
}));

vi.mock('@/hooks/useWebPush', () => ({
  useWebPush: () => ({ isSupported: false, isSubscribed: false, isLoading: false, permission: 'default' }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(useUnreadCount).mockReturnValue({ data: { unreadCount: 1 } } as any);
    vi.mocked(useNotifications).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            id: 'notification-1',
            type: 'NEW_HOMEWORK_ASSIGNED',
            notificationType: 'NEW_HOMEWORK_ASSIGNED',
            title: '📝 واجب جديد: واجب المراجعة',
            message: 'تمت إضافة واجب جديد لمجموعتك.',
            data: { assessmentId: 'assessment-1' },
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    } as any);
    vi.mocked(useMarkRead).mockReturnValue({ mutate: vi.fn() } as any);
    vi.mocked(useMarkAllRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it('shows the homework badge and routes to the student homework dashboard', () => {
    renderWithClient(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText('📝 واجب جديد: واجب المراجعة'));

    expect(push).toHaveBeenCalledWith('/student/dashboard');
  });

  it('opens notification detail modal when clicking a notification without route', () => {
    vi.mocked(useNotifications).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            id: 'notification-cred-1',
            type: 'STUDENT_APPROVAL_CREDENTIALS',
            notificationType: 'STUDENT_APPROVAL_CREDENTIALS',
            title: '🎉 مرحباً بك! تم قبول انضمام الطالب سلمي',
            message: 'تحية طيبة وبعد، أهلاً بحضرتك ولي أمر سلمي الكريم. كلمة المرور الخاصة بالطالب: tqd7wG والرابط https://al-awal.online/login',
            data: {
              studentPhoneOrCode: '01553302369',
              studentPassword: 'tqd7wG',
              parentPassword: 'p5zT7Y',
            },
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    } as any);

    renderWithClient(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText('🎉 مرحباً بك! تم قبول انضمام الطالب سلمي'));

    // Modal should open and show title and copy button
    expect(screen.getByText('بيانات القبول والدخول')).toBeInTheDocument();
    expect(screen.getByText('نسخ نص الإشعار')).toBeInTheDocument();
    expect(screen.getByText('tqd7wG')).toBeInTheDocument();
  });

  it('toggles inline message expansion when clicking عرض المزيد', () => {
    const longMessage = 'هذه رسالة إشعار طويلة جداً تحتوي على تفاصيل كثيرة وتعليمات هامة يجب على ولي الأمر والطالب قراءتها بعناية للمتابعة أولاً بأول.';
    vi.mocked(useNotifications).mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            id: 'notification-long-1',
            type: 'GENERAL_ANNOUNCEMENT',
            notificationType: 'GENERAL_ANNOUNCEMENT',
            title: 'إعلان هام',
            message: longMessage,
            data: {},
            isRead: true,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    } as any);

    renderWithClient(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    expect(screen.getByText('عرض المزيد')).toBeInTheDocument();

    fireEvent.click(screen.getByText('عرض المزيد'));
    expect(screen.getByText('عرض أقل')).toBeInTheDocument();
  });
});

