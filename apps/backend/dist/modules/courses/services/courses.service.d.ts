import { PrismaService } from '../../../core/database/prisma.service';
import { CourseProgressRepository, SyncProgressItemDto, SyncBatchResult } from '../repositories/course-progress.repository';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class CoursesService {
    private readonly prisma;
    private readonly progressRepository;
    private readonly bunnyVideoService;
    private readonly storageService;
    private readonly logger;
    constructor(prisma: PrismaService, progressRepository: CourseProgressRepository, bunnyVideoService: BunnyVideoService, storageService: StorageService);
    createCourse(teacherId: string, dto: CreateCourseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        academicStage: string | null;
        status: import(".prisma/client").$Enums.CourseStatus;
        description: string | null;
        title: string;
        teacherId: string;
        subject: string;
        price: import("@prisma/client/runtime/library").Decimal;
        coverImageUrl: string | null;
        orderIndex: number;
    }>;
    getPublishedCatalog(query: CourseQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
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
        academicStage: string | null;
        status: import(".prisma/client").$Enums.CourseStatus;
        description: string | null;
        title: string;
        teacherId: string;
        subject: string;
        price: import("@prisma/client/runtime/library").Decimal;
        coverImageUrl: string | null;
        orderIndex: number;
    }>>;
    getCourseDetails(courseId: string): Promise<{
        _count: {
            enrollments: number;
        };
        teacher: {
            user: {
                email: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            specialty: string | null;
            bio: string | null;
        };
        modules: ({
            lessons: {
                id: string;
                createdAt: Date;
                description: string;
                title: string;
                orderIndex: number;
                lessonType: string;
                videoDurationSeconds: number;
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
        academicStage: string | null;
        status: import(".prisma/client").$Enums.CourseStatus;
        description: string | null;
        title: string;
        teacherId: string;
        subject: string;
        price: import("@prisma/client/runtime/library").Decimal;
        coverImageUrl: string | null;
        orderIndex: number;
    }>;
    updateCourse(courseId: string, teacherId: string, isSecretariat: boolean, dto: UpdateCourseDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLevel: string;
        academicStage: string | null;
        status: import(".prisma/client").$Enums.CourseStatus;
        description: string | null;
        title: string;
        teacherId: string;
        subject: string;
        price: import("@prisma/client/runtime/library").Decimal;
        coverImageUrl: string | null;
        orderIndex: number;
    }>;
    createModule(courseId: string, teacherId: string, isSecretariat: boolean, dto: CreateModuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        courseId: string;
        orderIndex: number;
    }>;
    createLesson(moduleId: string, teacherId: string, isSecretariat: boolean, dto: CreateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        orderIndex: number;
        moduleId: string;
        lessonType: string;
        videoAssetId: string | null;
        bunnyVideoId: string | null;
        contentUrl: string | null;
        videoDurationSeconds: number | null;
        isPreview: boolean;
    }>;
    enrollCourse(courseId: string, studentId: string): Promise<{
        enrollmentId: string;
        courseId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.CourseEnrollmentStatus;
        accessStatus: import(".prisma/client").$Enums.CourseAccessStatus;
        enrolledAt: Date;
    }>;
    getMyCourses(studentId: string): Promise<{
        courseId: string;
        title: string;
        description: string;
        subject: string;
        gradeLevel: string;
        coverImageUrl: string;
        teacherName: string;
        enrolledAt: Date;
        accessStatus: import(".prisma/client").$Enums.CourseAccessStatus;
        totalModules: number;
        totalLessons: number;
        progressPercentage: number;
    }[]>;
    getLessonViewer(lessonId: string, user: AuthenticatedUser): Promise<{
        lessonId: string;
        moduleId: string;
        courseId: string;
        courseTitle: string;
        title: string;
        description: string;
        lessonType: string;
        isPreview: boolean;
        videoDurationSeconds: number;
        videoPlayerUrl: string;
        documentDownloadUrl: string;
        lastPositionSeconds: number;
        isCompleted: boolean;
    }>;
    updateLessonProgress(studentId: string, lessonId: string, dto: UpdateProgressDto): Promise<{
        lessonId: string;
        courseId: string;
        lastPositionSeconds: number;
        isCompleted: boolean;
        overallCourseCompletionPercentage: number;
        lastSyncedAt: Date;
    }>;
    applyMonotonicProgressBatch(studentId: string, items: SyncProgressItemDto[]): Promise<SyncBatchResult>;
}
