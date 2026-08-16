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
        teacherId: string;
        groupId: string | null;
        courseId: string | null;
        lessonId: string | null;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        isAutoGraded: boolean;
        isPublished: boolean;
        dueDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAssessments(query: AssessmentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        course: {
            id: string;
            title: string;
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
        group: {
            id: string;
            name: string;
        };
        _count: {
            questions: number;
            submissions: number;
        };
    } & {
        id: string;
        teacherId: string;
        groupId: string | null;
        courseId: string | null;
        lessonId: string | null;
        title: string;
        description: string | null;
        type: import(".prisma/client").$Enums.AssessmentType;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        isAutoGraded: boolean;
        isPublished: boolean;
        dueDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            questionNumber: number;
            assessmentId: string;
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
        status: "SUBMITTED" | "GRADED";
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
            academicStage: string | null;
            studentCode: string | null;
            qrCodeToken: string;
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
                questionNumber: number;
                assessmentId: string;
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
