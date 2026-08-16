import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AssessmentType } from '@prisma/client';

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  type: AssessmentType;
  totalScore?: number;
  passingScore?: number;
  isAutoGraded?: boolean;
  dueDate?: Date;
  groupId?: string;
  courseId?: string;
  lessonId?: string;
  teacherId: string;
}

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssessment(dto: CreateAssessmentDto) {
    return this.prisma.assessment.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        totalScore: dto.totalScore || 100.0,
        passingScore: dto.passingScore,
        isAutoGraded: dto.isAutoGraded || false,
        dueDate: dto.dueDate,
        groupId: dto.groupId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
      },
    });
  }

  async getAssessmentById(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${id}] not found`);
    }

    return assessment;
  }
}
