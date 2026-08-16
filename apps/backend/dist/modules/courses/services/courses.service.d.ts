import { PrismaService } from '../../../core/database/prisma.service';
import { CourseProgressRepository, SyncProgressItemDto, SyncBatchResult } from '../repositories/course-progress.repository';
export interface CreateCourseDto {
    title: string;
    description?: string;
    subject: string;
    gradeLevel: string;
    coverImageUrl?: string;
    teacherId: string;
}
export declare class CoursesService {
    private readonly prisma;
    private readonly progressRepository;
    constructor(prisma: PrismaService, progressRepository: CourseProgressRepository);
    createCourse(dto: CreateCourseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        description: string | null;
        teacherId: string;
        status: import(".prisma/client").$Enums.CourseStatus;
        title: string;
        subject: string;
        coverImageUrl: string | null;
        orderIndex: number;
    }>;
    getPublishedCatalog(gradeLevel?: string): Promise<({
        _count: {
            enrollments: number;
            modules: number;
        };
        teacher: {
            user: {
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            specialty: string | null;
            bio: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        description: string | null;
        teacherId: string;
        status: import(".prisma/client").$Enums.CourseStatus;
        title: string;
        subject: string;
        coverImageUrl: string | null;
        orderIndex: number;
    })[]>;
    getCourseDetails(courseId: string): Promise<{
        modules: ({
            lessons: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                title: string;
                orderIndex: number;
                moduleId: string;
                videoAssetId: string | null;
                videoDurationSeconds: number | null;
                isPreview: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            courseId: string;
            orderIndex: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        description: string | null;
        teacherId: string;
        status: import(".prisma/client").$Enums.CourseStatus;
        title: string;
        subject: string;
        coverImageUrl: string | null;
        orderIndex: number;
    }>;
    applyMonotonicProgressBatch(studentId: string, items: SyncProgressItemDto[]): Promise<SyncBatchResult>;
}
