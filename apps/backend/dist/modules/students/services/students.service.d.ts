import { PrismaService } from '../../../core/database/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
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
    private assertStudentAccess;
    getStudentById(studentId: string, user: AuthenticatedUser): Promise<{
        user: {
            id: string;
            email: string;
            phone: string;
            fullName: string;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        studentCode: string;
        gradeLevel: string;
        academicStage: string;
        academicStatus: import(".prisma/client").$Enums.StudentAcademicStatus;
        dateOfBirth: Date;
        emergencyPhone: string;
        parentLinks: ({
            parent: {
                user: {
                    id: string;
                    phone: string;
                    fullName: string;
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
                gradeLevel: string;
                name: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
            groupId: string;
            studentId: string;
            enrolledAt: Date;
        })[];
    }>;
    getStudentQrCode(studentId: string, user: AuthenticatedUser): Promise<StudentQrCodeResponseDto>;
    regenerateQrToken(studentId: string, user: AuthenticatedUser): Promise<StudentQrCodeResponseDto>;
    getStudents(query: StudentQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        user: {
            id: string;
            email: string;
            phone: string;
            fullName: string;
            isActive: boolean;
        };
        groupEnrollments: ({
            group: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
            groupId: string;
            studentId: string;
            enrolledAt: Date;
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
    }>>;
}
