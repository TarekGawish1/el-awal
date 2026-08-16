import { UsersService } from '../services/users.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMyProfile(user: AuthenticatedUser): Promise<{
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
            studentCode: string | null;
            qrCodeToken: string;
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
        fullName: string;
        phone: string | null;
        email: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
