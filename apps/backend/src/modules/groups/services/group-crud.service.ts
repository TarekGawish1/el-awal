import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  findScheduleConflict,
  buildConflictMessage,
  ScheduleLike,
} from '../utils/schedule-conflict.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class GroupCrudService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Helper: Validates that a teacher owns the target group (Secretariat/Admin bypasses).
   */
  async checkTeacherOwnership(group: { teacherId: string }, user?: AuthenticatedUser) {
    if (!user) return;
    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (group.teacherId === teacherId || group.teacherId === user.id) {
        return;
      }
      if (typeof this.prisma.teacherProfile?.findFirst === 'function') {
        const teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { OR: [{ id: user.teacherProfileId }, { user: { id: user.id } }, { id: user.id }] },
        });
        if (teacherProfile && group.teacherId === teacherProfile.id) {
          return;
        }
      }
      throw new ForbiddenException(
        'You do not have permission to view or manage this academic group',
      );
    }
  }

  /**
   * Throws a ConflictException when any candidate schedule slot clashes.
   */
  async assertNoScheduleConflict(
    effectiveTeacherId: string,
    candidate: {
      schedules?: ScheduleLike[] | null;
      academicYear?: string | null;
      academicTerm?: string | null;
    },
    excludeGroupId?: string,
  ) {
    if (!candidate.schedules?.length) return;

    const academicYear = candidate.academicYear || '2026-2027';
    const academicTerm = candidate.academicTerm || 'FIRST_TERM';

    const where: any = {
      OR: [
        { teacherId: effectiveTeacherId },
        { teacher: { id: effectiveTeacherId } },
      ],
      isActive: true,
      academicYear,
      academicTerm,
    };
    if (excludeGroupId) {
      where.id = { not: excludeGroupId };
    }

    const existingGroups = await this.prisma.academicGroup.findMany({
      where,
      select: {
        id: true,
        name: true,
        schedules: {
          select: { dayOfWeek: true, startTime: true, endTime: true, location: true },
        },
      },
    });

    const conflict = findScheduleConflict(existingGroups, candidate.schedules);
    if (conflict) {
      throw new ConflictException(buildConflictMessage(conflict));
    }
  }

  /**
   * Creates a new physical academic group assigned to the authenticated teacher.
   */
  async createGroup(teacherId: string, dto: CreateGroupDto, currentUser?: AuthenticatedUser) {
    if (dto.id) {
      const existing = await this.prisma.academicGroup.findUnique({
        where: { id: dto.id },
        include: { schedules: true },
      });
      if (existing) {
        return existing;
      }
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });

    let effectiveTeacherId = teacherId;
    if (!teacherProfile) {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: teacherId, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      if (link) {
        effectiveTeacherId = link.teacherId;
      } else {
        throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
      }
    }

    await this.assertNoScheduleConflict(effectiveTeacherId, {
      schedules: dto.schedules,
      academicYear: dto.academicYear,
      academicTerm: dto.academicTerm,
    });

    const creatorName = currentUser?.fullName || (currentUser?.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم');
    const creatorId = currentUser?.id || null;

    const createdGroup = await this.prisma.academicGroup.create({
      data: {
        id: dto.id || undefined,
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        academicYear: dto.academicYear || '2026-2027',
        academicTerm: dto.academicTerm || 'FIRST_TERM',
        description: dto.description,
        maxCapacity: dto.maxCapacity || 50,
        monthlyFee: dto.monthlyFee || 0.0,
        teacherId: effectiveTeacherId,
        createdById: creatorId,
        createdByName: creatorName,
        updatedById: creatorId,
        updatedByName: creatorName,
        schedules: dto.schedules?.length ? {
          create: dto.schedules.map(s => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || null,
          })),
        } : undefined,
      },
      include: { schedules: true },
    });

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern('student:dashboard:*');
      await this.redisCache.delPattern('parent:overview:*');
    }

    return createdGroup;
  }

  /**
   * Lists all active groups managed by a specific teacher.
   */
  async getTeacherGroups(teacherId: string, academicYear?: string, academicTerm?: string) {
    let effectiveTeacherId = teacherId;
    const teacherProfile = await this.prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { id: teacherId },
          { user: { id: teacherId } },
        ],
      },
    });
    if (teacherProfile) {
      effectiveTeacherId = teacherProfile.id;
    } else {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: teacherId, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      if (link) {
        effectiveTeacherId = link.teacherId;
      } else {
        throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
      }
    }

    const cacheKey = `groups:teacher:${effectiveTeacherId}:${academicYear || 'all'}:${academicTerm || 'all'}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const where: any = {
      OR: [
        { teacherId: effectiveTeacherId },
        { teacher: { id: effectiveTeacherId } },
      ],
      isActive: true,
    };
    if (academicYear) where.academicYear = academicYear;
    if (academicTerm) where.academicTerm = academicTerm;

    const groups = await this.prisma.academicGroup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        _count: {
          select: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            sessions: true,
          },
        },
      },
    });

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, groups, 600);
    }

    return groups;
  }

  /**
   * Retrieves single group metadata, schedules, and active student count.
   */
  async getGroupById(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        _count: {
          select: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            sessions: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    return group;
  }

  /**
   * Updates an academic group and its schedules
   */
  async updateGroup(groupId: string, dto: UpdateGroupDto, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    const { schedules, ...updateData } = dto;

    if (schedules !== undefined) {
      await this.assertNoScheduleConflict(
        group.teacherId,
        {
          schedules,
          academicYear: dto.academicYear ?? group.academicYear,
          academicTerm: dto.academicTerm ?? group.academicTerm,
        },
        groupId,
      );
    }

    const updaterName = user?.fullName || (user?.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedGroup = await tx.academicGroup.update({
        where: { id: groupId },
        data: {
          ...updateData,
          updatedById: user?.id || null,
          updatedByName: updaterName,
        },
      });

      if (schedules !== undefined) {
        await tx.lessonSchedule.deleteMany({ where: { groupId } });
        if (schedules.length > 0) {
          await tx.lessonSchedule.createMany({
            data: schedules.map((s) => ({
              groupId,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              location: s.location || null,
            })),
          });
        }
      }

      return updatedGroup;
    });

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern('student:dashboard:*');
      await this.redisCache.delPattern('parent:overview:*');
    }

    return result;
  }

  /**
   * Deletes a group permanently (cascading schedules and enrollments).
   */
  async deleteGroup(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    await this.prisma.academicGroup.delete({
      where: { id: groupId },
    });

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern('student:dashboard:*');
      await this.redisCache.delPattern('parent:overview:*');
    }

    return { success: true, message: 'Group successfully deleted' };
  }

  /**
   * Generates or retrieves the active self-registration invite token for a group.
   */
  async generateRegistrationLink(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    const now = new Date();
    const isExpired =
      !!group.registrationLinkExpiry && group.registrationLinkExpiry.getTime() < now.getTime();

    let token = group.registrationToken;
    if (!token || isExpired) {
      token = randomBytes(16).toString('hex');
      await this.prisma.academicGroup.update({
        where: { id: groupId },
        data: {
          registrationToken: token,
          registrationLinkExpiry: null,
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online';

    return {
      groupId: group.id,
      groupName: group.name,
      token,
      registrationUrl: `${appUrl}/register/group?token=${token}`,
    };
  }
}
