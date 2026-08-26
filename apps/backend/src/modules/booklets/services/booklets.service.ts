import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateBookletDto } from '../dto/create-booklet.dto';
import { UpdateBookletDto } from '../dto/update-booklet.dto';
import { BookletQueryDto } from '../dto/booklet-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole, PaymentStatus, PaymentType } from '@prisma/client';

@Injectable()
export class BookletsService {
  private readonly logger = new Logger(BookletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveTeacherProfileId(user: AuthenticatedUser): Promise<string> {
    if (user.teacherProfileId) {
      return user.teacherProfileId;
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: {
        OR: [{ id: user.id }, { user: { id: user.id } }],
      },
    });

    if (teacher) {
      return teacher.id;
    }

    const primaryTeacher = await this.prisma.teacherProfile.findFirst();
    if (primaryTeacher) {
      return primaryTeacher.id;
    }

    throw new ForbiddenException('No active teacher profile found for this operation');
  }

  /**
   * Creates a new booklet linked to the teacher profile, grade level, and optional group.
   */
  async create(user: AuthenticatedUser, dto: CreateBookletDto) {
    const teacherProfileId = await this.resolveTeacherProfileId(user);

    // 1. If groupId is specified, verify ownership
    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }
      if (user.role === UserRole.TEACHER && group.teacherId !== teacherProfileId && group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own this academic group');
      }
    }

    // 2. Resolve academic period defaults from teacher profile if not provided
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { activeAcademicYear: true, activeAcademicTerm: true },
    });

    const academicYear = dto.academicYear || teacherProfile?.activeAcademicYear || '2026-2027';
    const academicTerm = dto.academicTerm || teacherProfile?.activeAcademicTerm || 'FIRST_TERM';

    const booklet = await this.prisma.booklet.create({
      data: {
        title: dto.title.trim(),
        price: dto.price,
        gradeLevel: dto.gradeLevel.trim(),
        groupId: dto.groupId || null,
        teacherProfileId,
        academicYear,
        academicTerm,
        stockCount: dto.stockCount !== undefined ? dto.stockCount : null,
        isActive: true,
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true } },
      },
    });

    this.logger.log(
      `Booklet created [${booklet.id}] "${booklet.title}" for grade "${booklet.gradeLevel}" by teacher [${teacherProfileId}]`,
    );

    return {
      ...booklet,
      price: Number(booklet.price),
      salesCount: 0,
      totalRevenue: 0,
    };
  }

  /**
   * Retrieves booklets filtered by academic period, grade level, and group with sales stats.
   */
  async findAll(user: AuthenticatedUser, query: BookletQueryDto) {
    let teacherProfileId: string | null = null;
    try {
      teacherProfileId = await this.resolveTeacherProfileId(user);
    } catch {
      // For student/parent, teacher profile might not be directly attached
    }

    const where: any = {};

    if (teacherProfileId && (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT)) {
      where.teacherProfileId = teacherProfileId;
    }

    if (query.gradeLevel) {
      where.gradeLevel = query.gradeLevel;
    }

    if (query.groupId) {
      // If group is filtered, return booklets specific to this group OR general for the grade
      where.OR = [
        { groupId: query.groupId },
        { groupId: null },
      ];
    }

    if (query.academicYear) {
      where.academicYear = query.academicYear;
    }

    if (query.academicTerm) {
      where.academicTerm = query.academicTerm;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
      where.isActive = true;
    }

    const booklets = await this.prisma.booklet.findMany({
      where,
      include: {
        group: { select: { id: true, name: true, gradeLevel: true } },
        payments: {
          where: { paymentStatus: PaymentStatus.PAID },
          select: { id: true, amountPaid: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return booklets.map((b) => {
      const salesCount = b.payments.length;
      const totalRevenue = b.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0);
      const { payments, ...rest } = b;

      return {
        ...rest,
        price: Number(b.price),
        salesCount,
        totalRevenue,
      };
    });
  }

  /**
   * Retrieves single booklet details with detailed payment history.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    const booklet = await this.prisma.booklet.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true } },
        payments: {
          where: { paymentStatus: PaymentStatus.PAID },
          include: {
            student: {
              include: { user: { select: { fullName: true, phone: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booklet) {
      throw new NotFoundException(`Booklet [${id}] not found`);
    }

    const salesCount = booklet.payments.length;
    const totalRevenue = booklet.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0);

    return {
      ...booklet,
      price: Number(booklet.price),
      salesCount,
      totalRevenue,
      payments: booklet.payments.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student?.user?.fullName || 'طالب',
        amountPaid: Number(p.amountPaid),
        receiptNumber: p.receiptNumber,
        createdAt: p.createdAt,
      })),
    };
  }

  /**
   * Updates an existing booklet.
   */
  async update(id: string, user: AuthenticatedUser, dto: UpdateBookletDto) {
    const teacherProfileId = await this.resolveTeacherProfileId(user);

    const existing = await this.prisma.booklet.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Booklet [${id}] not found`);
    }

    if (user.role === UserRole.TEACHER && existing.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('You do not own this booklet');
    }

    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }
    }

    const updated = await this.prisma.booklet.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.gradeLevel !== undefined ? { gradeLevel: dto.gradeLevel.trim() } : {}),
        ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
        ...(dto.stockCount !== undefined ? { stockCount: dto.stockCount } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true } },
        payments: {
          where: { paymentStatus: PaymentStatus.PAID },
          select: { id: true, amountPaid: true },
        },
      },
    });

    const salesCount = updated.payments.length;
    const totalRevenue = updated.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0);
    const { payments, ...rest } = updated;

    this.logger.log(`Booklet [${id}] updated by user [${user.id}]`);

    return {
      ...rest,
      price: Number(updated.price),
      salesCount,
      totalRevenue,
    };
  }

  /**
   * Deactivates (soft deletes) or permanently removes a booklet.
   */
  async delete(id: string, user: AuthenticatedUser) {
    const teacherProfileId = await this.resolveTeacherProfileId(user);

    const existing = await this.prisma.booklet.findUnique({
      where: { id },
      include: {
        _count: { select: { payments: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Booklet [${id}] not found`);
    }

    if (user.role === UserRole.TEACHER && existing.teacherProfileId !== teacherProfileId) {
      throw new ForbiddenException('You do not own this booklet');
    }

    // If payments are already associated with this booklet, soft-deactivate instead of hard delete
    if (existing._count.payments > 0) {
      await this.prisma.booklet.update({
        where: { id },
        data: { isActive: false },
      });
      this.logger.log(`Booklet [${id}] has ${existing._count.payments} payments; soft deactivated.`);
      return { success: true, softDeleted: true, message: 'تم إيقاف تفعيل المذكرة بنجاح لوجود عمليات سداد مرتبطة بها' };
    }

    await this.prisma.booklet.delete({
      where: { id },
    });

    this.logger.log(`Booklet [${id}] permanently deleted by user [${user.id}]`);
    return { success: true, softDeleted: false, message: 'تم حذف المذكرة بنجاح' };
  }
}
