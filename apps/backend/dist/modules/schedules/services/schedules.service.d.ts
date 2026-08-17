import { PrismaService } from '../../../core/database/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class SchedulesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private assertGroupAccess;
    createSchedule(dto: CreateScheduleDto, user: AuthenticatedUser): Promise<{
        id: string;
        groupId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
    }>;
    getGroupSchedules(groupId: string, user: AuthenticatedUser): Promise<{
        id: string;
        groupId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
    }[]>;
    deleteSchedule(scheduleId: string, user: AuthenticatedUser): Promise<{
        id: string;
        groupId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
    }>;
    generateSessionsFromSchedule(groupId: string, dto: GenerateSessionsDto, user: AuthenticatedUser): Promise<{
        groupId: string;
        groupName: string;
        generatedCount: number;
        sessions: any[];
    }>;
}
