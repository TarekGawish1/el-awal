import { ForbiddenException, Injectable } from '@nestjs/common';
import { TestimonialStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CreateTestimonialDto } from '../dto/create-testimonial.dto';
import { UpdateTestimonialDto } from '../dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForStudent(user: AuthenticatedUser, dto: CreateTestimonialDto) {
    const studentId = this.getStudentProfileId(user);

    return this.prisma.testimonial.create({
      data: {
        studentId,
        content: dto.content,
        rating: dto.rating,
        status: TestimonialStatus.PENDING,
      },
    });
  }

  async findMine(user: AuthenticatedUser) {
    const studentId = this.getStudentProfileId(user);

    return this.prisma.testimonial.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublic() {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { status: TestimonialStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        rating: true,
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
      firstName: this.getFirstName(student.user.fullName),
      gradeLevel: student.gradeLevel,
    }));
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
      fullName: student.user.fullName,
      firstName: this.getFirstName(student.user.fullName),
      gradeLevel: student.gradeLevel,
    }));
  }

  async update(id: string, dto: UpdateTestimonialDto) {
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
