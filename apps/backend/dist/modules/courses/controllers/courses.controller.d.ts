import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    getCatalog(query: CourseQueryDto): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
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
    createCourse(dto: CreateCourseDto, user: AuthenticatedUser): Promise<{
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
    getMyCourses(user: AuthenticatedUser): Promise<{
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
    getCourseDetails(id: string, user: AuthenticatedUser): Promise<{
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
    updateCourse(id: string, dto: UpdateCourseDto, user: AuthenticatedUser): Promise<{
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
    createModule(courseId: string, dto: CreateModuleDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        courseId: string;
        orderIndex: number;
    }>;
    createLesson(moduleId: string, dto: CreateLessonDto, user: AuthenticatedUser): Promise<{
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
    enrollCourse(courseId: string, user: AuthenticatedUser): Promise<{
        enrollmentId: string;
        courseId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.CourseEnrollmentStatus;
        accessStatus: import(".prisma/client").$Enums.CourseAccessStatus;
        enrolledAt: Date;
    }>;
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
    updateLessonProgress(lessonId: string, dto: UpdateProgressDto, user: AuthenticatedUser): Promise<{
        lessonId: string;
        courseId: string;
        lastPositionSeconds: number;
        isCompleted: boolean;
        overallCourseCompletionPercentage: number;
        lastSyncedAt: Date;
    }>;
}
