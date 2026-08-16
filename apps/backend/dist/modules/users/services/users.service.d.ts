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
            gradeLevel: string;
            academicStage: string | null;
            studentCode: string | null;
            qrCodeToken: string;
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
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        email: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        deletedAt: Date | null;
    }>;
}
