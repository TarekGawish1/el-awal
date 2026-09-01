import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IsString, IsOptional, IsArray, IsEnum, IsEmail } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { AssistantPermission, AssistantStatus, UserRole, NotificationType, NotificationChannel } from '@prisma/client';
import { NotificationsService } from '../../notifications/services/notifications.service';

export class InviteAssistantDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AssistantPermission, { each: true })
  permissions?: AssistantPermission[];
}

export class UpdateAssistantDto {
  @IsOptional()
  @IsEnum(AssistantStatus)
  status?: AssistantStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(AssistantPermission, { each: true })
  permissions?: AssistantPermission[];

  @IsOptional()
  @IsString({ each: true })
  assignedGroupIds?: string[];

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

@Injectable()
export class AssistantsService {
  private readonly logger = new Logger(AssistantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    } else {
      // If user exists (e.g. was previously added or deleted), update their password and name if provided
      const updateData: any = {};
      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      }
      if (dto.fullName) {
        updateData.fullName = dto.fullName;
      }
      if (dto.email && !user.email) {
        updateData.email = dto.email;
      }
      if (user.role !== UserRole.SECRETARIAT && user.role !== UserRole.TEACHER) {
        updateData.role = UserRole.SECRETARIAT;
      }
      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    if (user.role !== UserRole.SECRETARIAT && user.role !== UserRole.TEACHER) {
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
        status: AssistantStatus.ACTIVE,
        permissions: dto.permissions || [],
      },
      include: {
        assistant: { select: { id: true, fullName: true, phone: true } },
      },
    });

    // Send WhatsApp notification with credentials
    if (user.phone || dto.phone) {
      const targetPhone = user.phone || dto.phone!;
      const passText = dto.password ? `\n- كلمة المرور: ${dto.password}` : '';
      const messageText = `مرحباً ${user.fullName}،\nتم إضافتك كمساعد وسكرتارية في منصة الأوّل.\n\nبيانات الدخول:\n- الهاتف: ${targetPhone}${passText}\n\nرابط المنصة: https://al-awal.online/login`;
      
      try {
        await this.notificationsService.sendNotification({
          recipientId: user.id,
          type: 'ASSISTANT_CREDENTIALS',
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          title: 'بيانات حساب المساعد',
          body: messageText,
          channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
          data: {
            phone: targetPhone,
            assistantName: user.fullName,
            password: dto.password,
            isUpdate: false,
          },
        });
        this.logger.log(`WhatsApp credentials notification queued for assistant ${user.fullName} (${targetPhone})`);
      } catch (notifErr) {
        this.logger.error(`Failed to send WhatsApp notification to assistant: ${notifErr}`);
      }
    }

    return newAssistant;
  }

  async updateAssistant(teacherId: string, id: string, dto: UpdateAssistantDto) {
    const existing = await this.prisma.teacherAssistant.findUnique({
      where: { id },
      include: { assistant: true },
    });

    if (!existing || existing.teacherId !== teacherId) {
      throw new NotFoundException('Assistant relationship not found');
    }

    if (dto.fullName || dto.phone || dto.email || dto.password) {
      const userData: any = {};
      if (dto.fullName) userData.fullName = dto.fullName;
      if (dto.phone) userData.phone = dto.phone;
      if (dto.email) userData.email = dto.email;
      if (dto.password) {
        userData.passwordHash = await bcrypt.hash(dto.password, 10);
      }
      
      const updatedUser = await this.prisma.user.update({
        where: { id: existing.assistantId },
        data: userData,
      });

      if (dto.password || dto.phone) {
        const targetPhone = updatedUser.phone || dto.phone;
        if (targetPhone) {
          const passText = dto.password ? `\n- كلمة المرور: ${dto.password}` : '\n- كلمة المرور: (لم تتغير)';
          const messageText = `مرحباً ${updatedUser.fullName}،\nتم تحديث بيانات حساب المساعد الخاص بك في منصة الأوّل.\n\nبيانات الدخول:${passText}\n- الهاتف: ${updatedUser.phone}\n\nرابط المنصة: https://al-awal.online/login`;
          
          try {
            await this.notificationsService.sendNotification({
              recipientId: updatedUser.id,
              type: 'ASSISTANT_CREDENTIALS',
              notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
              title: 'تحديث بيانات حساب المساعد',
              body: messageText,
              channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
              data: {
                phone: targetPhone,
                assistantName: updatedUser.fullName,
                password: dto.password,
                isUpdate: true,
              },
            });
            this.logger.log(`WhatsApp credentials update notification queued for assistant ${updatedUser.fullName} (${targetPhone})`);
          } catch (notifErr) {
            this.logger.error(`Failed to send WhatsApp update notification to assistant: ${notifErr}`);
          }
        }
      }
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
