import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBell from './NotificationBell';
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkRead } from '@/hooks/useNotifications';

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
    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText('📝 واجب جديد: واجب المراجعة'));

    expect(push).toHaveBeenCalledWith('/student/dashboard');
  });
});
