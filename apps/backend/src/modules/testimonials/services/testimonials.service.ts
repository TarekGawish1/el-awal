import { ForbiddenException, Injectable, Logger, Optional } from '@nestjs/common';
import { TestimonialStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CreateTestimonialDto } from '../dto/create-testimonial.dto';
import { CreateManualTestimonialDto } from '../dto/create-manual-testimonial.dto';
import { UpdateTestimonialDto } from '../dto/update-testimonial.dto';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);
  private readonly publicCache = new MemoryCache(120, 10);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  private async invalidateTestimonialsCache() {
    this.publicCache.clear();
    if (this.redisCache) {
      try {
        await this.redisCache.delPattern('testimonials:*');
      } catch (err) {
        this.logger.warn(`Failed to invalidate testimonials cache: ${err}`);
      }
    }
  }

  async saveForStudent(user: AuthenticatedUser, dto: CreateTestimonialDto) {
    await this.invalidateTestimonialsCache();
    const studentId = this.getStudentProfileId(user);

    return this.prisma.testimonial.upsert({
      where: { studentId },
      create: {
        studentId,
        content: dto.content.trim(),
        rating: dto.rating,
        status: TestimonialStatus.PENDING,
      },
      update: {
        content: dto.content.trim(),
        rating: dto.rating,
        status: TestimonialStatus.PENDING,
        moderatedAt: null,
      },
    });
  }

  async createManual(dto: CreateManualTestimonialDto) {
    await this.invalidateTestimonialsCache();
    return this.prisma.testimonial.create({
      data: {
        displayName: dto.displayName.trim(),
        gradeLevel: dto.gradeLevel?.trim() || null,
        content: dto.content.trim(),
        rating: dto.rating,
        status: dto.status || TestimonialStatus.APPROVED,
        moderatedAt: dto.status === TestimonialStatus.PENDING ? null : new Date(),
      },
    });
  }

  async findMine(user: AuthenticatedUser) {
    const studentId = this.getStudentProfileId(user);

    return this.prisma.testimonial.findUnique({
      where: { studentId },
    });
  }

  async findPublic() {
    const cacheKey = 'testimonials:public';
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.publicCache.getOrSet('public_testimonials', async () => {
      const testimonials = await this.prisma.testimonial.findMany({
        where: { status: TestimonialStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          rating: true,
          displayName: true,
          gradeLevel: true,
          student: {
            select: {
              gradeLevel: true,
              user: { select: { fullName: true } },
            },
          },
        },
      });

      return testimonials.map(({ student, ...testimonial }) => ({
        ...testimonial,
        firstName: testimonial.displayName || this.getFirstName(student?.user.fullName || ''),
        gradeLevel: testimonial.gradeLevel || student?.gradeLevel || null,
      }));
    });

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 600);
    }

    return result;
  }

  async findAll() {
    const testimonials = await this.prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            gradeLevel: true,
            user: { select: { fullName: true } },
          },
        },
      },
    });

    return testimonials.map(({ student, ...testimonial }) => ({
      ...testimonial,
      fullName: testimonial.displayName || student?.user.fullName || 'رأي مضاف يدوياً',
      firstName: testimonial.displayName || this.getFirstName(student?.user.fullName || ''),
      gradeLevel: testimonial.gradeLevel || student?.gradeLevel || null,
    }));
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.invalidateTestimonialsCache();
    return this.prisma.testimonial.update({
      where: { id },
      data: {
        content: dto.content,
        rating: dto.rating,
        status: dto.status,
        moderatedAt: dto.status ? new Date() : undefined,
      },
    });
  }

  private getStudentProfileId(user: AuthenticatedUser): string {
    if (!user.studentProfileId) {
      throw new ForbiddenException('A student profile is required to submit testimonials');
    }

    return user.studentProfileId;
  }

  private getFirstName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0];
  }
}
