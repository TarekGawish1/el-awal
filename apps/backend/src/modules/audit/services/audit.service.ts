import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditQueryDto } from '../dto/audit-query.dto';

export interface LogActivityParams {
  userId: string;
  userRole: UserRole;
  userName: string;
  teacherId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Delete legacy invalid V1 / sync logs
      await this.prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: { in: ['V1', 'v1', 'SYNC', 'sync'] } },
            { description: { contains: 'V1' } },
            { description: { contains: 'v1' } },
            { description: { contains: 'بتعديل بيانات معلم' } },
          ],
        },
      });

      // 2. Fix legacy logs that had generic 'المعلم' as userName
      const genericLogs = await this.prisma.auditLog.findMany({
        where: { userName: 'المعلم' },
        select: { id: true, userId: true },
      });
      for (const log of genericLogs) {
        const user = await this.prisma.user.findUnique({
          where: { id: log.userId },
          select: { fullName: true },
        });
        if (user?.fullName) {
          await this.prisma.auditLog.update({
            where: { id: log.id },
            data: { userName: user.fullName },
          });
        }
      }
    } catch {}
  }

  /**
   * Non-blocking activity logging
   */
  async logActivity(params: LogActivityParams): Promise<void> {
    try {
      // Never log internal sync batch calls or V1 entities
      if (['V1', 'v1', 'SYNC', 'sync'].includes(params.entityType)) {
        return;
      }

      // If teacherId is not passed and user is TEACHER, user.id is the teacherId
      let resolvedTeacherId = params.teacherId;
      if (!resolvedTeacherId && params.userRole === UserRole.TEACHER) {
        resolvedTeacherId = params.userId;
      }

      // If user is SECRETARIAT and teacherId not provided, lookup teacherAssistant link
      if (!resolvedTeacherId && params.userRole === UserRole.SECRETARIAT) {
        const link = await this.prisma.teacherAssistant.findFirst({
          where: { assistantId: params.userId },
          select: { teacherId: true },
        });
        resolvedTeacherId = link?.teacherId;
      }

      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          userRole: params.userRole,
          userName: params.userName,
          teacherId: resolvedTeacherId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          description: params.description,
          details: params.details || {},
          ipAddress: params.ipAddress,
          userAgent: params.userAgent ? params.userAgent.slice(0, 500) : undefined,
        },
      });

      this.logger.debug(`[Audit] ${params.userName} (${params.userRole}) -> ${params.action} ${params.entityType}: ${params.description}`);
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err?.message}`, err?.stack);
    }
  }

  /**
   * Retrieve paginated audit logs for a teacher workspace
   */
  async getLogs(teacherId: string, query: AuditQueryDto) {
    const { search, action, entityType, userId, userRole, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { teacherId },
        { userId: teacherId },
      ],
      entityType: { notIn: ['V1', 'v1', 'SYNC', 'sync'] },
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (userRole) {
      where.userRole = userRole;
    }

    if (userId) {
      const ids = userId.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 1) {
        where.userId = ids[0];
      } else if (ids.length > 1) {
        where.userId = { in: ids };
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { description: { contains: term, mode: 'insensitive' } },
            { userName: { contains: term, mode: 'insensitive' } },
            { entityName: { contains: term, mode: 'insensitive' } },
            { entityType: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Summary overview stats for the audit dashboard
   */
  async getStats(teacherId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baseWhere = {
      OR: [{ teacherId }, { userId: teacherId }],
      entityType: { notIn: ['V1', 'v1', 'SYNC', 'sync'] },
    };

    const [todayCount, weekCount, totalCount, assistantCount, actionDistribution, topPerformers] = await Promise.all([
      // Actions today
      this.prisma.auditLog.count({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfToday },
        },
      }),
      // Actions past 7 days
      this.prisma.auditLog.count({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfWeek },
        },
      }),
      // Total lifetime logs
      this.prisma.auditLog.count({
        where: baseWhere,
      }),
      // Actions performed specifically by assistants
      this.prisma.auditLog.count({
        where: {
          ...baseWhere,
          userRole: UserRole.SECRETARIAT,
        },
      }),
      // Grouped by Action
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: baseWhere,
        _count: { _all: true },
      }),
      // Grouped by User
      this.prisma.auditLog.groupBy({
        by: ['userId', 'userName', 'userRole'],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      todayCount,
      weekCount,
      totalCount,
      assistantCount,
      actionDistribution: actionDistribution.map((item) => ({
        action: item.action,
        count: item._count._all,
      })),
      topPerformers: topPerformers.map((item) => ({
        userId: item.userId,
        userName: item.userName,
        userRole: item.userRole,
        actionCount: item._count._all,
      })),
    };
  }

  /**
   * Get distinct users who have performed actions + all registered assistants
   */
  async getPerformers(teacherId: string) {
    const [teacher, assistantLinks, auditPerformers] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: teacherId },
        select: { id: true, fullName: true, role: true },
      }),
      this.prisma.teacherAssistant.findMany({
        where: { teacherId },
        include: {
          assistant: {
            select: { id: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [{ teacherId }, { userId: teacherId }],
        },
        distinct: ['userId'],
        select: {
          userId: true,
          userName: true,
          userRole: true,
        },
      }),
    ]);

    const performersMap = new Map<string, { userId: string; userName: string; userRole: string }>();

    if (teacher) {
      performersMap.set(teacher.id, {
        userId: teacher.id,
        userName: teacher.fullName,
        userRole: teacher.role,
      });
    }

    for (const link of assistantLinks) {
      if (link.assistant) {
        performersMap.set(link.assistant.id, {
          userId: link.assistant.id,
          userName: link.assistant.fullName,
          userRole: link.assistant.role,
        });
      }
    }

    for (const p of auditPerformers) {
      if (!performersMap.has(p.userId)) {
        performersMap.set(p.userId, p);
      }
    }

    return Array.from(performersMap.values());
  }
}
