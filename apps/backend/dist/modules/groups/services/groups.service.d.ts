import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
export declare class GroupsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createGroup(teacherId: string, dto: CreateGroupDto): Promise<{
        id: string;
        teacherId: string;
        description: string | null;
        gradeLevel: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
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
        teacherId: string;
        description: string | null;
        gradeLevel: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getGroupById(groupId: string): Promise<{
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
        teacherId: string;
        description: string | null;
        gradeLevel: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    enrollStudent(groupId: string, studentId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        studentId: string;
        enrolledAt: Date;
        groupId: string;
    }>;
    dropStudent(groupId: string, studentId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        studentId: string;
        enrolledAt: Date;
        groupId: string;
    }>;
    getGroupRoster(groupId: string): Promise<{
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
