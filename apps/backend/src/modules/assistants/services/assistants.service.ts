import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { AssistantPermission, AssistantStatus, UserRole } from '@prisma/client';

export class InviteAssistantDto {
  phone?: string;
  email?: string;
  fullName?: string;
  password?: string;
}

export class UpdateAssistantDto {
  status?: AssistantStatus;
  permissions?: AssistantPermission[];
  assignedGroupIds?: string[];
}

@Injectable()
export class AssistantsService {
  private readonly logger = new Logger(AssistantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listAssistants(teacherId: string) {
    const assistants = await this.prisma.teacherAssistant.findMany({
      where: { teacherId },
      include: {
        assistant: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return assistants;
  }

  async inviteAssistant(teacherId: string, dto: InviteAssistantDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Phone or email must be provided to invite an assistant.');
    }

    const whereClause = dto.phone ? { phone: dto.phone } : { email: dto.email };
    let user = await this.prisma.user.findUnique({ where: whereClause as any });

    if (!user) {
      if (!dto.fullName || !dto.password) {
        throw new NotFoundException('No user found. To create a new account, please provide a full name and password.');
      }
      
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          role: UserRole.SECRETARIAT,
          isActive: true,
        }
      });
    }

    if (user.role !== UserRole.SECRETARIAT) {
      throw new BadRequestException(`User is registered as ${user.role}. Only Secretariat accounts can be assistants.`);
    }

    const existing = await this.prisma.teacherAssistant.findUnique({
      where: {
        teacherId_assistantId: { teacherId, assistantId: user.id },
      },
    });

    if (existing) {
      throw new ConflictException('This user is already an assistant or has been invited.');
    }

    const newAssistant = await this.prisma.teacherAssistant.create({
      data: {
        teacherId,
        assistantId: user.id,
        status: AssistantStatus.ACTIVE, // Fast-tracking to ACTIVE for simplicity in MVP
        permissions: [],
      },
      include: {
        assistant: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return newAssistant;
  }

  async updateAssistant(teacherId: string, id: string, dto: UpdateAssistantDto) {
    const existing = await this.prisma.teacherAssistant.findUnique({
      where: { id },
    });

    if (!existing || existing.teacherId !== teacherId) {
      throw new NotFoundException('Assistant relationship not found');
    }

    const updated = await this.prisma.teacherAssistant.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.permissions && { permissions: dto.permissions }),
        ...(dto.assignedGroupIds && { assignedGroupIds: dto.assignedGroupIds }),
      },
      include: {
        assistant: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return updated;
  }

  async removeAssistant(teacherId: string, id: string) {
    const existing = await this.prisma.teacherAssistant.findUnique({
      where: { id },
    });

    if (!existing || existing.teacherId !== teacherId) {
      throw new NotFoundException('Assistant relationship not found');
    }

    await this.prisma.teacherAssistant.delete({
      where: { id },
    });

    return { success: true };
  }
}
