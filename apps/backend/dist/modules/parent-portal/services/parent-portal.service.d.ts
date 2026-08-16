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
                studentId: string;
                groupId: string;
                enrolledAt: Date;
                status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
            })[];
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
    } & {
        id: string;
        createdAt: Date;
        parentId: string;
        studentId: string;
    })[]>;
    getStudentAcademicSummary(parentId: string, studentId: string): Promise<{
        attendanceSummary: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AttendanceRecordGroupByOutputType, "status"[]> & {
            _count: {
                id: number;
            };
        })[];
        recentEvaluations: {
            id: string;
            createdAt: Date;
            teacherId: string;
            studentId: string;
            groupId: string | null;
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
