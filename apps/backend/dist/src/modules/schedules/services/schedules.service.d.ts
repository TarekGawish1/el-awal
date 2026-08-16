import { PrismaService } from '../../../core/database/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
export declare class SchedulesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createSchedule(dto: CreateScheduleDto): Promise<{
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
        groupId: string;
    }>;
    getGroupSchedules(groupId: string): Promise<{
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
        groupId: string;
    }[]>;
    deleteSchedule(scheduleId: string): Promise<{
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
        groupId: string;
    }>;
    generateSessionsFromSchedule(groupId: string, dto: GenerateSessionsDto): Promise<{
        groupId: string;
        groupName: string;
        generatedCount: number;
        sessions: any[];
    }>;
}
