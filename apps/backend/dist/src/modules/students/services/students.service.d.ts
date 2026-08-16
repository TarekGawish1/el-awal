import { PrismaService } from '../../../core/database/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
export declare class StudentsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createStudent(dto: CreateStudentDto): Promise<{
        id: string;
        studentCode: string;
        fullName: string;
        phone: string;
        email: string;
        gradeLevel: string;
        academicStage: string;
        academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
        qrCodeToken: string;
        createdAt: Date;
        hasParentLinked: boolean;
        enrolledGroupId: any;
    }>;
    getStudentById(studentId: string): Promise<{
        user: {
            id: string;
            fullName: string;
            phone: string;
            email: string;
            isActive: boolean;
        };
        parentLinks: ({
            parent: {
                user: {
                    id: string;
                    fullName: string;
                    phone: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                relationshipType: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            parentId: string;
            studentId: string;
        })[];
        groupEnrollments: ({
            group: {
                id: string;
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
    }>;
    getStudentQrCode(studentId: string): Promise<StudentQrCodeResponseDto>;
    regenerateQrToken(studentId: string): Promise<StudentQrCodeResponseDto>;
    getStudents(query: StudentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        user: {
            id: string;
            fullName: string;
            phone: string;
            email: string;
            isActive: boolean;
        };
        groupEnrollments: ({
            group: {
                id: string;
                name: string;
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
    }>>;
}
