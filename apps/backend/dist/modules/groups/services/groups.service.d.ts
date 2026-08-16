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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        name: string;
        gradeLevel: string;
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
            startTime: string;
            dayOfWeek: number;
            endTime: string;
            location: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        name: string;
        gradeLevel: string;
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
            startTime: string;
            dayOfWeek: number;
            endTime: string;
            location: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        name: string;
        gradeLevel: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
    }>;
    enrollStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        id: string;
        studentId: string;
        groupId: string;
        enrolledAt: Date;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
    }>;
    dropStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        id: string;
        studentId: string;
        groupId: string;
        enrolledAt: Date;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
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
                fullName: string;
                phone: string;
            };
            attendanceRate: number;
            totalPresent: number;
            totalSessions: number;
        }[];
    }>;
}
