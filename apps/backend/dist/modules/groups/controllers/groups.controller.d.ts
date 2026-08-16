import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { EnrollStudentDto } from '../dto/enroll-student.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    createGroup(dto: CreateGroupDto, user: AuthenticatedUser): Promise<{
        id: string;
        teacherId: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        gradeLevel: string;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    getMyGroups(user: AuthenticatedUser): Promise<({
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
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        gradeLevel: string;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getGroupById(id: string): Promise<{
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
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        gradeLevel: string;
        maxCapacity: number;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    enrollStudent(groupId: string, dto: EnrollStudentDto): Promise<{
        id: string;
        groupId: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        studentId: string;
        enrolledAt: Date;
    }>;
    dropStudent(groupId: string, studentId: string): Promise<{
        id: string;
        groupId: string;
        status: import(".prisma/client").$Enums.GroupEnrollmentStatus;
        studentId: string;
        enrolledAt: Date;
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
