import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AssistantPermission, UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<AssistantPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    if (!user || !user.role) {
      throw new ForbiddenException('User is undefined or unauthenticated');
    }

    // Teachers naturally have all permissions
    if (user.role === UserRole.TEACHER) {
      return true;
    }

    if (user.role !== UserRole.SECRETARIAT) {
      throw new ForbiddenException('غير مصرح لهذا الدور بتنفيذ هذا الإجراء');
    }

    // For assistants (Secretariat), check the TeacherAssistant relationship
    const relation = await this.prisma.teacherAssistant.findFirst({
      where: {
        assistantId: user.id,
        status: 'ACTIVE',
      },
    });

    if (!relation) {
      throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
    }

    const hasAllRequired = requiredPermissions.every((perm) =>
      relation.permissions.includes(perm),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException('عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء');
    }

    return true;
  }
}
