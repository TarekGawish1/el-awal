import { PrismaService } from '../../../core/database/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        teacherProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            specialty: string | null;
            bio: string | null;
        };
        studentProfile: {
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
        parentProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            relationshipType: string | null;
        };
        secretariatProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            staffTitle: string | null;
        };
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        fullName: string;
        passwordHash: string;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
