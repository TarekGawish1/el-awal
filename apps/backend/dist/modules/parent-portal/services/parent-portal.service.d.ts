import { PrismaService } from '../../../core/database/prisma.service';
export declare class ParentPortalService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLinkedStudents(parentId: string): Promise<({
        student: {
            user: {
                fullName: string;
                phone: string;
            };
            groupEnrollments: ({
                group: {
                    gradeLevel: string;
                    name: string;
                };
            } & {
                id: string;
                status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
                studentId: string;
                enrolledAt: Date;
                groupId: string;
            })[];
        } & {
            id: string;
            gradeLevel: string;
            academicStage: string | null;
            createdAt: Date;
            updatedAt: Date;
            studentCode: string | null;
            qrCodeToken: string;
            academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
            dateOfBirth: Date | null;
            emergencyPhone: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        studentId: string;
        parentId: string;
    })[]>;
    getStudentAcademicSummary(parentId: string, studentId: string): Promise<{
        attendanceSummary: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AttendanceRecordGroupByOutputType, "status"[]> & {
            _count: {
                id: number;
            };
        })[];
        recentEvaluations: {
            id: string;
            teacherId: string;
            createdAt: Date;
            studentId: string;
            groupId: string | null;
            evaluationDate: Date;
            studentLevel: string | null;
            teacherNotes: string;
        }[];
        recentSubmissions: ({
            assessment: {
                title: string;
                type: import(".prisma/client").$Enums.AssessmentType;
                totalScore: import("@prisma/client/runtime/library").Decimal;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.SubmissionStatus;
            studentId: string;
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
