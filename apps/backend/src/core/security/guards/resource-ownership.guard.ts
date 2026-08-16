import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

export interface OwnershipOptions {
  paramName?: string; // route param name (default: 'id')
  allowRoles?: UserRole[]; // roles that bypass ownership check (e.g. SECRETARIAT)
}

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';
export const CheckOwnership = (options: OwnershipOptions = {}) =>
  SetMetadata(RESOURCE_OWNERSHIP_KEY, options);

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<OwnershipOptions>(
      RESOURCE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true; // No ownership check required on this route
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    // Secretariat or allowed roles bypass ownership checks
    const defaultBypassRoles = [UserRole.SECRETARIAT];
    const allowedRoles = options.allowRoles || defaultBypassRoles;
    if (allowedRoles.includes(user.role)) {
      return true;
    }

    const paramName = options.paramName || 'id';
    const targetResourceId = request.params[paramName];

    if (!targetResourceId) {
      return true;
    }

    // Validate that the resource belongs to the active user's identity
    const matchesUser =
      targetResourceId === user.id ||
      targetResourceId === user.teacherProfileId ||
      targetResourceId === user.studentProfileId ||
      targetResourceId === user.parentProfileId;

    if (!matchesUser) {
      throw new ForbiddenException(
        'BOLA / IDOR Violation: You do not have permission to access or modify this specific resource.',
      );
    }

    return true;
  }
}
