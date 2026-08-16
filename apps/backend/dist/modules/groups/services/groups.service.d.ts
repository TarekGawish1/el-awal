import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class GroupsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private checkTeacherOwnership;
    createGroup(teacherId: string, dto: CreateGroupDto): Promise<{
        name: string;
        id: string;
        gradeLevel: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getTeacherGroups(teacherId: string): Promise<({
        schedules: {
            id: string;
            dayOfWeek: number;
            groupId: string;
            startTime: string;
            endTime: string;
            location: string | null;
        }[];
        _count: {
            enrollments: number;
            sessions: number;
        };
    } & {
        name: string;
        id: string;
        gradeLevel: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getGroupById(groupId: string, user?: AuthenticatedUser): Promise<{
        schedules: {
            id: string;
            dayOfWeek: number;
            groupId: string;
            startTime: string;
            endTime: string;
            location: string | null;
        }[];
        _count: {
            enrollments: number;
            sessions: number;
        };
    } & {
        name: string;
        id: string;
        gradeLevel: string;
        description: string | null;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        teacherId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    enrollStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        id: string;
        groupId: string;
        studentId: string;
        enrolledAt: Date;
    }>;
    dropStudent(groupId: string, studentId: string, user?: AuthenticatedUser): Promise<{
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        id: string;
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
                fullName: string;
                phone: string;
            };
            attendanceRate: number;
            totalPresent: number;
            totalSessions: number;
        }[];
    }>;
}
