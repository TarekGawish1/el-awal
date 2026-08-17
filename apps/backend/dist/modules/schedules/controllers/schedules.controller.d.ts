import { SchedulesService } from '../services/schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class SchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
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
    deleteSchedule(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        groupId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
    }>;
    generateSessions(groupId: string, dto: GenerateSessionsDto, user: AuthenticatedUser): Promise<{
        groupId: string;
        groupName: string;
        generatedCount: number;
        sessions: any[];
    }>;
}
