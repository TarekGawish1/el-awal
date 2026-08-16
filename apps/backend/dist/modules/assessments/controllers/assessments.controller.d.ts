import { AssessmentsService, CreateAssessmentDto } from '../services/assessments.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class AssessmentsController {
    private readonly assessmentsService;
    constructor(assessmentsService: AssessmentsService);
    createAssessment(dto: Omit<CreateAssessmentDto, 'teacherId'>, user: AuthenticatedUser): Promise<{
        id: string;
        teacherId: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        courseId: string | null;
        lessonId: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        groupId: string | null;
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
        teacherId: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        courseId: string | null;
        lessonId: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        groupId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        isAutoGraded: boolean;
        dueDate: Date | null;
    }>;
}
