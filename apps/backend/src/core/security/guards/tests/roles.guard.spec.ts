import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../roles.guard';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { AuthenticatedUser } from '../../decorators/current-user.decorator';
import { vi } from 'vitest';

describe('RolesGuard Active-Role Security Hardening (F-20)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(
    user: AuthenticatedUser | null,
    requiredRoles: UserRole[] | null,
  ): ExecutionContext {
    const mockRequest = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  describe('Baseline Single-Role Enforcement', () => {
    it('should allow access when no roles are required on route', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockExecutionContext(
        { id: 'u1', role: UserRole.STUDENT },
        null,
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user active role matches required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.TEACHER]);
      const context = createMockExecutionContext(
        { id: 'u1', role: UserRole.TEACHER, teacherProfileId: 't1' },
        [UserRole.TEACHER],
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user active role does not match required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.TEACHER]);
      const context = createMockExecutionContext(
        { id: 'u1', role: UserRole.STUDENT, studentProfileId: 's1' },
        [UserRole.TEACHER],
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user context is missing or unauthenticated', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.TEACHER]);
      const context = createMockExecutionContext(null, [UserRole.TEACHER]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Active-Role Enforcement for Multi-Role / Dual-Profile Users', () => {
    const dualRoleUserActingAsParent: AuthenticatedUser = {
      id: 'user-dual-1',
      role: UserRole.PARENT,
      parentProfileId: 'parent-prof-1',
      secretariatProfileId: 'sec-prof-1',
    };

    const dualRoleUserAfterSwitchToSecretariat: AuthenticatedUser = {
      id: 'user-dual-1',
      role: UserRole.SECRETARIAT,
      parentProfileId: 'parent-prof-1',
      secretariatProfileId: 'sec-prof-1',
    };

    it('denies access to SECRETARIAT route when active role is PARENT, despite secretariatProfileId presence', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SECRETARIAT]);
      const context = createMockExecutionContext(
        dualRoleUserActingAsParent,
        [UserRole.SECRETARIAT],
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('denies access to PARENT-only route when active role is SECRETARIAT, despite parentProfileId presence', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PARENT]);
      const context = createMockExecutionContext(
        dualRoleUserAfterSwitchToSecretariat,
        [UserRole.PARENT],
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows access to SECRETARIAT route after user legitimately switches active role to SECRETARIAT', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SECRETARIAT]);
      const context = createMockExecutionContext(
        dualRoleUserAfterSwitchToSecretariat,
        [UserRole.SECRETARIAT],
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows access to PARENT route when user is actively in PARENT role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PARENT]);
      const context = createMockExecutionContext(
        dualRoleUserActingAsParent,
        [UserRole.PARENT],
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows access to shared multi-role routes (e.g. parent portal overview) for either active role', () => {
      const sharedRoles = [UserRole.PARENT, UserRole.SECRETARIAT, UserRole.TEACHER];
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(sharedRoles);

      const parentContext = createMockExecutionContext(
        dualRoleUserActingAsParent,
        sharedRoles,
      );
      expect(guard.canActivate(parentContext)).toBe(true);

      const secretariatContext = createMockExecutionContext(
        dualRoleUserAfterSwitchToSecretariat,
        sharedRoles,
      );
      expect(guard.canActivate(secretariatContext)).toBe(true);
    });
  });
});
