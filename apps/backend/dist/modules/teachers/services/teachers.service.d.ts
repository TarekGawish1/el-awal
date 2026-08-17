import { PrismaService } from '../../../core/database/prisma.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
export declare class TeachersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getDashboardOverview(teacherId: string, query: DashboardOverviewQueryDto): Promise<{
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
