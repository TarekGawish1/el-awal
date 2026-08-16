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
export declare class AssessmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createAssessment(dto: CreateAssessmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        teacherId: string;
        groupId: string | null;
        title: string;
        lessonId: string | null;
        courseId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        isAutoGraded: boolean;
        dueDate: Date | null;
    }>;
    getAssessmentById(id: string): Promise<{
        questions: {
            id: string;
            questionNumber: number;
            assessmentId: string;
            questionText: string;
            questionType: import(".prisma/client").$Enums.QuestionType;
            optionsData: import("@prisma/client/runtime/library").JsonValue | null;
            correctAnswer: string;
            points: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        teacherId: string;
        groupId: string | null;
        title: string;
        lessonId: string | null;
        courseId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        isAutoGraded: boolean;
        dueDate: Date | null;
    }>;
}
