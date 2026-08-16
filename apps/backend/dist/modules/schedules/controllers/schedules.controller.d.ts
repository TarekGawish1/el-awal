import { SchedulesService } from '../services/schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
export declare class SchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
    createSchedule(dto: CreateScheduleDto): Promise<{
        id: string;
        groupId: string;
        startTime: string;
        dayOfWeek: number;
        endTime: string;
        location: string | null;
    }>;
    getGroupSchedules(groupId: string): Promise<{
        id: string;
        groupId: string;
        startTime: string;
        dayOfWeek: number;
        endTime: string;
        location: string | null;
    }[]>;
    deleteSchedule(id: string): Promise<{
        id: string;
        groupId: string;
        startTime: string;
        dayOfWeek: number;
        endTime: string;
        location: string | null;
    }>;
    generateSessions(groupId: string, dto: GenerateSessionsDto): Promise<{
        groupId: string;
        groupName: string;
        generatedCount: number;
        sessions: any[];
    }>;
}
