import { AssessmentsService } from '../services/assessments.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class AssessmentsController {
    private readonly assessmentsService;
    constructor(assessmentsService: AssessmentsService);
    createAssessment(dto: CreateAssessmentDto, user: AuthenticatedUser): Promise<{
        totalQuestions: number;
        type: import(".prisma/client").$Enums.AssessmentType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        groupId: string | null;
        teacherId: string;
        lessonId: string | null;
        courseId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        dueDate: Date | null;
        isPublished: boolean;
        isAutoGraded: boolean;
    }>;
    getAssessments(query: AssessmentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        course: {
            id: string;
            title: string;
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
        group: {
            id: string;
            name: string;
        };
    } & {
        type: import(".prisma/client").$Enums.AssessmentType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        groupId: string | null;
        teacherId: string;
        lessonId: string | null;
        courseId: string | null;
        totalScore: import("@prisma/client/runtime/library").Decimal;
        passingScore: import("@prisma/client/runtime/library").Decimal | null;
        durationMinutes: number | null;
        dueDate: Date | null;
        isPublished: boolean;
        isAutoGraded: boolean;
    }>>;
    getAssessmentById(id: string, user: AuthenticatedUser): Promise<{
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
            questionText: string;
            questionType: import(".prisma/client").$Enums.QuestionType;
            optionsData: import("@prisma/client/runtime/library").JsonValue | null;
            points: import("@prisma/client/runtime/library").Decimal;
            assessmentId: string;
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
                questionId: string;
                pointsEarned: import("@prisma/client/runtime/library").Decimal | null;
                teacherFeedback: string | null;
                submissionId: string;
                selectedAnswer: string | null;
                isCorrect: boolean | null;
                maxPointsSnapshot: import("@prisma/client/runtime/library").Decimal | null;
            }[];
        };
    }>;
    submitAssessment(id: string, dto: SubmitAssessmentDto, user: AuthenticatedUser): Promise<{
        submissionId: string;
        assessmentId: string;
        status: "SUBMITTED" | "GRADED";
        scoreObtained: number;
        totalScore: number;
        isAutoGraded: boolean;
        submittedAt: Date;
        gradedAt: Date;
    }>;
    gradeSubmission(submissionId: string, dto: GradeSubmissionDto, user: AuthenticatedUser): Promise<{
        id: string;
        assessmentId: string;
        student: {
            user: {
                phone: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            gradeLevel: string;
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
                questionNumber: number;
                questionText: string;
                questionType: import(".prisma/client").$Enums.QuestionType;
                optionsData: import("@prisma/client/runtime/library").JsonValue | null;
                correctAnswer: string;
                explanation: string | null;
                points: import("@prisma/client/runtime/library").Decimal;
                assessmentId: string;
            };
        } & {
            id: string;
            questionId: string;
            pointsEarned: import("@prisma/client/runtime/library").Decimal | null;
            teacherFeedback: string | null;
            submissionId: string;
            selectedAnswer: string | null;
            isCorrect: boolean | null;
            maxPointsSnapshot: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    getAssessmentSubmissions(id: string, user: AuthenticatedUser): Promise<{
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
