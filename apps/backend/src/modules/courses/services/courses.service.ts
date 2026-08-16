import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseProgressRepository, SyncProgressItemDto, SyncBatchResult } from '../repositories/course-progress.repository';
import { CourseStatus } from '@prisma/client';

export interface CreateCourseDto {
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  coverImageUrl?: string;
  teacherId: string;
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: CourseProgressRepository,
  ) {}

  async createCourse(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        gradeLevel: dto.gradeLevel,
        coverImageUrl: dto.coverImageUrl,
        teacherId: dto.teacherId,
        status: CourseStatus.DRAFT,
      },
    });
  }

  async getPublishedCatalog(gradeLevel?: string) {
    return this.prisma.course.findMany({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(gradeLevel ? { gradeLevel } : {}),
      },
      orderBy: { orderIndex: 'asc' },
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { modules: true, enrollments: true } },
      },
    });
  }

  async getCourseDetails(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    return course;
  }

  async applyMonotonicProgressBatch(
    studentId: string,
    items: SyncProgressItemDto[],
  ): Promise<SyncBatchResult> {
    return this.progressRepository.syncBatch(studentId, items);
  }
}
