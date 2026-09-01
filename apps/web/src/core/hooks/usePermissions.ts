import { useAuth } from '@/features/auth/hooks/useAuth';

export type Permission = 
  | 'MANAGE_STUDENTS'
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE'
  | 'MANAGE_ATTENDANCE'
  | 'MANAGE_GROUPS'
  | 'MANAGE_ASSESSMENTS';

export function usePermissions() {
  const { user } = useAuth();

  // Teachers naturally have all permissions
  if (user?.role === 'TEACHER') {
    return {
      can: () => true,
      permissions: ['MANAGE_STUDENTS', 'VIEW_FINANCE', 'MANAGE_FINANCE', 'MANAGE_ATTENDANCE', 'MANAGE_GROUPS', 'MANAGE_ASSESSMENTS'] as Permission[],
    };
  }

  // For SECRETARIAT, read from their session if it's there
  // Note: For a robust implementation, the auth provider should return `user.permissions`
  const permissions: Permission[] = (user as any)?.permissions || [];

  const can = (permission: Permission) => {
    return permissions.includes(permission);
  };

  return { can, permissions };
}
