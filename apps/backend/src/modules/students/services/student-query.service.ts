import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StudentQueryDto } from '../dto/student-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { GroupEnrollmentStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';

@Injectable()
export class StudentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated list of students with filtering and search capabilities.
   */
  async getStudents(query: StudentQueryDto, user?: AuthenticatedUser) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    let stageFilter: any = undefined;
    if (query.academicStage) {
      const s = query.academicStage;
      if (s === 'SECONDARY' || s === 'المرحلة الثانوية' || s.includes('ثانوي')) {
        stageFilter = { in: ['SECONDARY', 'المرحلة الثانوية', 'ثانوي'] };
      } else if (
        s === 'MIDDLE' ||
        s === 'PREPARATORY' ||
        s === 'المرحلة الإعدادية' ||
        s.includes('إعدادي')
      ) {
        stageFilter = { in: ['MIDDLE', 'PREPARATORY', 'المرحلة الإعدادية', 'إعدادي'] };
      } else if (
        s === 'PRIMARY' ||
        s === 'المرحلة الابتدائية' ||
        s.includes('ابتدائي')
      ) {
        stageFilter = { in: ['PRIMARY', 'المرحلة الابتدائية', 'ابتدائي'] };
      } else {
        stageFilter = s;
      }
    }

    const baseWhere: any = {
      ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
      ...(stageFilter ? { academicStage: stageFilter } : {}),
      academicStatus: query.academicStatus || 'ACTIVE',
      user: { isActive: true },
      ...(query.groupId
        ? query.groupId === 'UNASSIGNED'
          ? {
              groupEnrollments: {
                none: {
                  status: GroupEnrollmentStatus.ACTIVE,
                },
              },
            }
          : {
              groupEnrollments: {
                some: {
                  groupId: query.groupId,
                  status: GroupEnrollmentStatus.ACTIVE,
                },
              },
            }
        : {}),
    };

    if (query.search) {
      baseWhere.OR = [
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { phone: { contains: query.search } } },
        { studentCode: { contains: query.search, mode: 'insensitive' } },
        { qrCodeToken: query.search },
      ];
    }

    const where: any = { ...baseWhere };
    if (cursorFilter) {
      where.AND = [cursorFilter];
    }

    const [students, totalCount] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              isActive: true,
            },
          },
          groupEnrollments: {
            where: { status: GroupEnrollmentStatus.ACTIVE },
            include: { group: { select: { id: true, name: true } } },
          },
          parentLinks: {
            include: {
              parent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      phone: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.studentProfile.count({ where: baseWhere }),
    ]);

    const formattedStudents = students.map((st) => ({
      ...st,
      createdByName:
        st.createdByName ||
        (st.groupEnrollments?.[0]?.group?.name
          ? `رابط انضمام: ${st.groupEnrollments[0].group.name}`
          : null),
    }));

    return CursorPaginationHelper.formatResponse(formattedStudents, limit, totalCount);
  }
}
