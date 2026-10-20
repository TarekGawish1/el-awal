import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { CourseVideoService } from './course-video.service';
import { CourseCoreService } from './course-core.service';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { ReorderModulesDto } from '../dto/reorder-modules.dto';

@Injectable()
export class CourseModulesService {
  private readonly logger = new Logger(CourseModulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly videoService: CourseVideoService,
    private readonly coreService: CourseCoreService,
  ) {}

  /**
   * Adds a module/chapter to a course with auto-computed order index and optional unit quiz.
   */
  async createModule(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateModuleDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this course curriculum');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const moduleCount = await this.prisma.courseModule.count({ where: { courseId } });
      orderIndex = moduleCount + 1;
    }

    const created = await this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        orderIndex,
        unitQuizId: dto.unitQuizId || null,
      },
      include: {
        unitQuiz: { select: { id: true, title: true, type: true } },
      },
    });
    await this.coreService.clearCourseCurriculumCache(courseId);
    return created;
  }

  /**
   * Updates an existing course module / unit.
   */
  async updateModule(
    moduleId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateModuleDto,
  ) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundException(`Module [${moduleId}] not found`);
    }
    if (!isSecretariat && module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to modify this module');
    }

    const updated = await this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.unitQuizId !== undefined ? { unitQuizId: dto.unitQuizId } : {}),
      },
      include: {
        unitQuiz: { select: { id: true, title: true, type: true } },
      },
    });
    await this.coreService.clearCourseCurriculumCache(module.course.id);
    return updated;
  }

  /**
   * Deletes a module and purges all related Bunny Stream videos and attachments.
   */
  async deleteModule(moduleId: string, teacherId: string, isSecretariat: boolean) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundException(`Module [${moduleId}] not found`);
    }
    if (!isSecretariat && module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this module');
    }

    // Clean up all Bunny Stream videos belonging to this module
    const lessons = await this.prisma.courseLesson.findMany({
      where: { moduleId },
      select: { bunnyVideoId: true, videoAssetId: true, contentUrl: true },
    });

    const bunnyIdsToDelete = new Set<string>();
    for (const l of lessons) {
      const b1 = this.videoService.extractBunnyVideoId(l.bunnyVideoId);
      const b2 = this.videoService.extractBunnyVideoId(l.videoAssetId);
      const b3 = this.videoService.extractBunnyVideoId(l.contentUrl);
      if (b1) bunnyIdsToDelete.add(b1);
      if (b2) bunnyIdsToDelete.add(b2);
      if (b3) bunnyIdsToDelete.add(b3);
    }

    for (const videoId of bunnyIdsToDelete) {
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny video [${videoId}] for module [${moduleId}]:`, err);
      });
    }

    // Clean up all lesson attachments in this module from storage
    const attachments = await this.prisma.lessonAttachment.findMany({
      where: { lesson: { moduleId } },
      select: { fileKey: true, fileUrl: true },
    });
    for (const att of attachments) {
      const key = att.fileKey || att.fileUrl;
      if (key) {
        await this.storageService.deleteObject(key).catch(() => {});
      }
    }

    const deleted = await this.prisma.courseModule.delete({ where: { id: moduleId } });
    await this.coreService.clearCourseCurriculumCache(module.course.id);
    return deleted;
  }

  /**
   * Bulk reorders modules in a course.
   */
  async reorderModules(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: ReorderModulesDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }
    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to reorder modules in this course');
    }

    const result = await this.prisma.$transaction([
      ...dto.moduleOrders.map((item, i) =>
        this.prisma.courseModule.update({
          where: { id: item.moduleId },
          data: { orderIndex: -(i + 1) },
        }),
      ),
      ...dto.moduleOrders.map((item) =>
        this.prisma.courseModule.update({
          where: { id: item.moduleId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);
    await this.coreService.clearCourseCurriculumCache(courseId);
    return result;
  }
}
