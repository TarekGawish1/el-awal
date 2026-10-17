import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { normalizeEgyptianPhone } from '../../../common/utils/phone.util';
import { ChangeTeacherPasswordDto } from '../dto/change-teacher-password.dto';

@Injectable()
export class TeacherProfileService {
  private readonly logger = new Logger(TeacherProfileService.name);
  private readonly academicPeriodCache = new MemoryCache(120, 10);

  constructor(private readonly prisma: PrismaService) {}

  async resolveEffectiveTeacherId(teacherIdOrUserId: string): Promise<string> {
    const directProfile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherIdOrUserId },
      select: { id: true },
    });
    if (directProfile) {
      return directProfile.id;
    }

    const byUserRelation = await this.prisma.teacherProfile.findFirst({
      where: { user: { id: teacherIdOrUserId } },
      select: { id: true },
    });
    if (byUserRelation) {
      return byUserRelation.id;
    }

    // Check if the caller is an assistant actively linked to a teacher
    const link = await this.prisma.teacherAssistant.findFirst({
      where: { assistantId: teacherIdOrUserId, status: 'ACTIVE' },
      select: { teacherId: true },
    });
    if (link) {
      return link.teacherId;
    }

    throw new ForbiddenException('لا يوجد ملف معلم مرتبط أو ارتباط نشط كمعاون');
  }

  async getAcademicPeriod(teacherId?: string) {
    const cacheKey = `academic_period:${teacherId || 'default'}`;
    return this.academicPeriodCache.getOrSet(cacheKey, async () => {
      const effectiveTeacherId = await this.resolveEffectiveTeacherId(teacherId);
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { id: effectiveTeacherId },
        select: {
          activeAcademicYear: true,
          activeAcademicTerm: true,
        },
      });

      return {
        activeAcademicYear: profile?.activeAcademicYear || '2026-2027',
        activeAcademicTerm: profile?.activeAcademicTerm || 'FIRST_TERM',
      };
    });
  }

  async updateAcademicPeriod(
    teacherId: string,
    dto: { activeAcademicYear: string; activeAcademicTerm: string },
  ) {
    this.academicPeriodCache.clear();
    const targetId = await this.resolveEffectiveTeacherId(teacherId);

    const updated = await this.prisma.teacherProfile.upsert({
      where: { id: targetId },
      create: {
        id: targetId,
        activeAcademicYear: dto.activeAcademicYear,
        activeAcademicTerm: dto.activeAcademicTerm,
      },
      update: {
        activeAcademicYear: dto.activeAcademicYear,
        activeAcademicTerm: dto.activeAcademicTerm,
      },
      select: {
        activeAcademicYear: true,
        activeAcademicTerm: true,
      },
    });

    this.logger.log(
      `Academic period updated to [${dto.activeAcademicYear} - ${dto.activeAcademicTerm}] for teacher [${targetId}] by caller [${teacherId}]`,
    );

    return updated;
  }

  async getSavedLocations(teacherId: string): Promise<string[]> {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(teacherId);
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { id: effectiveTeacherId },
      select: { savedLocations: true },
    });

    return teacherProfile?.savedLocations || [];
  }

  async updateSavedLocations(teacherId: string, locations: string[]): Promise<string[]> {
    const targetId = await this.resolveEffectiveTeacherId(teacherId);

    const updated = await this.prisma.teacherProfile.update({
      where: { id: targetId },
      data: { savedLocations: locations },
      select: { savedLocations: true },
    });

    return updated.savedLocations;
  }

  async getTeacherProfile(teacherId: string) {
    let profile = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        teacherProfile: {
          select: {
            id: true,
            specialty: true,
            bio: true,
            activeAcademicYear: true,
            activeAcademicTerm: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    if (profile.role === 'SECRETARIAT') {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: teacherId, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      if (!link) {
        throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
      }
      const linkedTeacher = await this.prisma.user.findUnique({
        where: { id: link.teacherId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          teacherProfile: {
            select: {
              id: true,
              specialty: true,
              bio: true,
              activeAcademicYear: true,
              activeAcademicTerm: true,
            },
          },
        },
      });
      if (!linkedTeacher) {
        throw new NotFoundException('Linked teacher profile not found');
      }
      return linkedTeacher;
    }

    if (profile.role !== 'TEACHER') {
      throw new ForbiddenException('الحساب المطلوب ليس حساب معلم أو معاون مرتبط');
    }

    return profile;
  }

  async updateTeacherProfile(
    teacherId: string,
    dto: { fullName?: string; phone?: string },
  ) {
    if (!dto.fullName && !dto.phone) {
      throw new BadRequestException('At least one of fullName or phone must be provided');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== 'TEACHER') {
      throw new ForbiddenException('فقط المعلم يملك صلاحية تعديل بيانات حسابه الأساسية');
    }
    const targetId = teacherId;

    const data: { fullName?: string; phone?: string } = {};
    if (dto.fullName !== undefined) {
      const name = dto.fullName.trim();
      if (name.length < 3) {
        throw new BadRequestException('Name must be at least 3 characters');
      }
      data.fullName = name;
    }
    if (dto.phone !== undefined) {
      const normalized = normalizeEgyptianPhone(dto.phone.trim());
      const conflict = await this.prisma.user.findFirst({
        where: { phone: normalized, id: { not: targetId } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('This phone number is already registered to another account');
      }
      data.phone = normalized;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        teacherProfile: {
          select: {
            id: true,
            specialty: true,
            bio: true,
            activeAcademicYear: true,
            activeAcademicTerm: true,
          },
        },
      },
    });

    this.logger.log(`Teacher profile updated for user [${targetId}]`);
    return updated;
  }

  async changeTeacherPassword(
    userId: string,
    dto: ChangeTeacherPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('حساب المستخدم غير موجود');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('كلمة المرور الجديدة لا يمكن أن تكون مطابقة لكلمة المرور الحالية');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password successfully updated for teacher [${userId}]`);

    return {
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    };
  }
}
