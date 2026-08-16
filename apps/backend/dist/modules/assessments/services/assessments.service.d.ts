import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class AssessmentsService {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    createAssessment(teacherId: string, isSecretariat: boolean, dto: CreateAssessmentDto): Promise<{
        totalQuestions: number;
        id: string;
        groupId: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        teacherId: string;
        type: import(".prisma/client").$Enums.AssessmentType;
        title: string;
        isAutoGraded: boolean;
        courseId: string | null;
        lessonId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        isPublished: boolean;
        dueDate: Date | null;
    }>;
    getAssessments(query: AssessmentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        group: {
            id: string;
            name: string;
        };
        _count: {
            questions: number;
            submissions: number;
        };
        teacher: {
            user: {
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            specialty: string | null;
            bio: string | null;
        };
        course: {
            id: string;
            title: string;
        };
    } & {
        id: string;
        groupId: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        teacherId: string;
        type: import(".prisma/client").$Enums.AssessmentType;
        title: string;
        isAutoGraded: boolean;
        courseId: string | null;
        lessonId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        isPublished: boolean;
        dueDate: Date | null;
    }>>;
    getAssessmentById(assessmentId: string, user: AuthenticatedUser): Promise<{
        id: string;
        title: string;
        description: string;
        type: import(".prisma/client").$Enums.AssessmentType;
        totalScore: number;
        passingScore: number;
        durationMinutes: number;
        dueDate: Date;
        isPublished: boolean;
        teacher: {
            user: {
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            specialty: string | null;
            bio: string | null;
        };
        group: {
            id: string;
            name: string;
        };
        course: {
            id: string;
            title: string;
        };
        questions: {
            id: string;
            assessmentId: string;
            questionNumber: number;
            questionText: string;
            questionType: import(".prisma/client").$Enums.QuestionType;
            optionsData: import("@prisma/client/runtime/library").JsonValue | null;
            points: import("@prisma/client/runtime/library").Decimal;
        }[];
        mySubmission: {
            id: string;
            status: import(".prisma/client").$Enums.SubmissionStatus;
            scoreObtained: number;
            submittedAt: Date;
            gradedAt: Date;
            teacherFeedback: string;
            answers: {
                id: string;
                teacherFeedback: string | null;
                submissionId: string;
                questionId: string;
                selectedAnswer: string | null;
                isCorrect: boolean | null;
                pointsEarned: import("@prisma/client/runtime/library").Decimal | null;
                maxPointsSnapshot: import("@prisma/client/runtime/library").Decimal | null;
            }[];
        };
    }>;
    submitAssessment(assessmentId: string, studentId: string, dto: SubmitAssessmentDto): Promise<{
        submissionId: string;
        assessmentId: string;
        status: "GRADED" | "SUBMITTED";
        scoreObtained: number;
        totalScore: number;
        isAutoGraded: boolean;
        submittedAt: Date;
        gradedAt: Date;
    }>;
    gradeSubmission(submissionId: string, teacherId: string, isSecretariat: boolean, dto: GradeSubmissionDto): Promise<{
        id: string;
        assessmentId: string;
        student: {
            user: {
                fullName: string;
                phone: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            gradeLevel: string;
            studentCode: string | null;
            qrCodeToken: string;
            academicStage: string | null;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
        };
        status: import(".prisma/client").$Enums.SubmissionStatus;
        scoreObtained: number;
        totalScore: number;
        teacherFeedback: string;
        gradedAt: Date;
        answers: ({
            question: {
                id: string;
                assessmentId: string;
                questionNumber: number;
                questionText: string;
                questionType: import(".prisma/client").$Enums.QuestionType;
                optionsData: import("@prisma/client/runtime/library").JsonValue | null;
                correctAnswer: string;
                explanation: string | null;
                points: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            teacherFeedback: string | null;
            submissionId: string;
            questionId: string;
            selectedAnswer: string | null;
            isCorrect: boolean | null;
            pointsEarned: import("@prisma/client/runtime/library").Decimal | null;
            maxPointsSnapshot: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    getAssessmentSubmissions(assessmentId: string, teacherId: string, isSecretariat: boolean): Promise<{
        assessmentId: string;
        assessmentTitle: string;
        totalScore: number;
        totalSubmissions: number;
        submissions: {
            id: string;
            studentId: string;
            studentName: string;
            studentPhone: string;
            status: import(".prisma/client").$Enums.SubmissionStatus;
            scoreObtained: number;
            submittedAt: Date;
            gradedAt: Date;
            isAutoGraded: boolean;
        }[];
    }>;
}
