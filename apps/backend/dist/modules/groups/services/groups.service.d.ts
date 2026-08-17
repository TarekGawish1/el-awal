import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class GroupsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private checkTeacherOwnership;
    createGroup(teacherId: string, dto: CreateGroupDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        name: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
    }>;
    getTeacherGroups(teacherId: string): Promise<({
        _count: {
            enrollments: number;
            sessions: number;
        };
        schedules: {
            id: string;
            groupId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            location: string | null;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        name: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
    })[]>;
    getGroupById(groupId: string, user?: AuthenticatedUser): Promise<{
        _count: {
            enrollments: number;
            sessions: number;
        };
        schedules: {
            id: string;
            groupId: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            location: string | null;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        name: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
    }>;
    enrollStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        groupId: string;
        studentId: string;
        enrolledAt: Date;
    }>;
    dropStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        groupId: string;
        studentId: string;
        enrolledAt: Date;
    }>;
    getGroupRoster(groupId: string, user?: AuthenticatedUser): Promise<{
        groupId: string;
        groupName: string;
        totalEnrolled: number;
        maxCapacity: number;
        roster: {
            enrollmentId: string;
            studentId: string;
            studentCode: string;
            fullName: string;
            phone: string;
            gradeLevel: string;
            enrolledAt: Date;
            parent: {
                phone: string;
                fullName: string;
            };
            attendanceRate: number;
            totalPresent: number;
            totalSessions: number;
        }[];
    }>;
}
