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
