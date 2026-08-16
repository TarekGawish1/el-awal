import { CoursesService, CreateCourseDto } from '../services/courses.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    getCatalog(gradeLevel?: string): Promise<({
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
    createCourse(dto: Omit<CreateCourseDto, 'teacherId'>, user: AuthenticatedUser): Promise<{
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
    getCourseDetails(id: string): Promise<{
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
}
