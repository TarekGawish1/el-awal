import { TeachersService } from '../services/teachers.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class TeachersController {
    private readonly teachersService;
    constructor(teachersService: TeachersService);
    getDashboardOverview(query: DashboardOverviewQueryDto, user: AuthenticatedUser): Promise<{
        kpis: {
            todaySessionsCount: number;
            activeSessionsCount: number;
            totalActiveStudents: number;
            totalActiveGroups: number;
            weeklyAttendanceRate: number;
            attendanceRateDelta: number;
            pendingGradingCount: number;
            pendingGradingAssessmentsCount: number;
        };
        todaySessions: any[];
        attendanceTrends: {
            period: string;
            rate: number;
            dateLabel: string;
        }[];
        atRiskStudents: any[];
        pendingGradingList: {
            assessmentId: string;
            assessmentTitle: string;
            groupName: string;
            pendingCount: number;
            dueDate?: string;
            daysPending: number;
        }[];
        groupPerformance: {
            groupId: string;
            groupName: string;
            gradeLevel: string;
            enrolledCount: number;
            attendanceRate: number;
            averageExamScore: number;
        }[];
        lastUpdatedTimestamp: string;
    }>;
}
