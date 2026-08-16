import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
export declare class ParentPortalService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    verifyGuardianLink(parentId: string, studentId: string): Promise<void>;
    getLinkedStudents(parentId: string): Promise<{
        linkId: string;
        relationshipType: string;
        student: {
            id: string;
            studentCode: string;
            fullName: string;
            phone: string;
            email: string;
            gradeLevel: string;
            academicStage: string;
            activeGroups: {
                id: string;
                name: string;
                gradeLevel: string;
            }[];
        };
    }[]>;
    getStudentOverview(parentId: string, studentId: string): Promise<{
        student: {
            id: string;
            studentCode: string;
            fullName: string;
            gradeLevel: string;
        };
        kpis: {
            attendanceRatePercentage: number;
            totalSessionsAttended: number;
            totalSessionsMissed: number;
            academicAveragePercentage: number;
            totalGradedAssessments: number;
            enrolledPhysicalGroups: number;
            enrolledOnlineCourses: number;
            currentMonthBilling: {
                periodYear: number;
                periodMonth: number;
                isPaid: boolean;
                amountPaid: number;
                status: import(".prisma/client").$Enums.PaymentStatus;
            };
        };
        recentAttendance: {
            sessionId: string;
            groupName: string;
            sessionDate: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            recordedAt: Date;
        }[];
        recentAssessments: {
            submissionId: string;
            assessmentTitle: string;
            type: import(".prisma/client").$Enums.AssessmentType;
            status: import(".prisma/client").$Enums.SubmissionStatus;
            scoreObtained: number;
            totalScore: number;
            submittedAt: Date;
        }[];
    }>;
    getStudentAttendance(parentId: string, studentId: string, query: CursorPaginationDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        id: string;
        sessionId: string;
        sessionDate: Date;
        topic: string;
        groupName: string;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
        recordedAt: Date;
        createdAt: Date;
        notes: string;
    }>>;
    getStudentAssessments(parentId: string, studentId: string): Promise<{
        submissionId: string;
        assessmentId: string;
        title: string;
        type: import(".prisma/client").$Enums.AssessmentType;
        teacherName: string;
        status: import(".prisma/client").$Enums.SubmissionStatus;
        scoreObtained: number;
        totalScore: number;
        passingScore: number;
        isPassed: boolean;
        submittedAt: Date;
        gradedAt: Date;
        teacherFeedback: string;
    }[]>;
    getStudentCourses(parentId: string, studentId: string): Promise<{
        courseId: string;
        title: string;
        subject: string;
        gradeLevel: string;
        teacherName: string;
        enrolledAt: Date;
        totalModules: number;
        totalLessons: number;
        completedLessons: number;
        progressPercentage: number;
    }[]>;
}
