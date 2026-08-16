import { ParentPortalService } from '../services/parent-portal.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class ParentPortalController {
    private readonly parentPortalService;
    constructor(parentPortalService: ParentPortalService);
    getLinkedStudents(user: AuthenticatedUser): Promise<({
        student: {
            user: {
                fullName: string;
                phone: string;
            };
            groupEnrollments: ({
                group: {
                    name: string;
                    gradeLevel: string;
                };
            } & {
                id: string;
                groupId: string;
                studentId: string;
                enrolledAt: Date;
                status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
            })[];
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
    } & {
        id: string;
        createdAt: Date;
        parentId: string;
        studentId: string;
    })[]>;
    getStudentSummary(studentId: string, user: AuthenticatedUser): Promise<{
        attendanceSummary: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AttendanceRecordGroupByOutputType, "status"[]> & {
            _count: {
                id: number;
            };
        })[];
        recentEvaluations: {
            id: string;
            createdAt: Date;
            teacherId: string;
            groupId: string | null;
            studentId: string;
            evaluationDate: Date;
            studentLevel: string | null;
            teacherNotes: string;
        }[];
        recentSubmissions: ({
            assessment: {
                type: import(".prisma/client").$Enums.AssessmentType;
                title: string;
                totalScore: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            studentId: string;
            status: import(".prisma/client").$Enums.SubmissionStatus;
            isAutoGraded: boolean;
            assessmentId: string;
            submittedAt: Date;
            attachmentUrl: string | null;
            scoreObtained: import("@prisma/client/runtime/library").Decimal | null;
            gradedAt: Date | null;
            teacherFeedback: string | null;
        })[];
    }>;
}
