import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { EnrollStudentDto } from '../dto/enroll-student.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    createGroup(dto: CreateGroupDto, user: AuthenticatedUser): Promise<{
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
    getMyGroups(user: AuthenticatedUser): Promise<({
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
    getGroupById(id: string, user: AuthenticatedUser): Promise<{
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
    enrollStudent(groupId: string, dto: EnrollStudentDto, user: AuthenticatedUser): Promise<{
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        id: string;
        groupId: string;
        studentId: string;
        enrolledAt: Date;
    }>;
    dropStudent(groupId: string, studentId: string, user: AuthenticatedUser): Promise<{
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        id: string;
        groupId: string;
        studentId: string;
        enrolledAt: Date;
    }>;
    getGroupRoster(groupId: string, user: AuthenticatedUser): Promise<{
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
