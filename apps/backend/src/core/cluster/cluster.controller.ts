import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClusterService } from './cluster.service';
import { Roles } from '../security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../security/decorators/public.decorator';

import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ScaleUpDto {
  @ApiPropertyOptional({ description: 'Duration in minutes to keep Worker 2 active', example: 120, default: 120 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(720)
  durationMinutes?: number;
}

@ApiTags('System & Cluster Management')
@Controller('system/cluster')
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Get current cluster status, active workers, and exam mode state' })
  @ApiResponse({ status: 200, description: 'Cluster status details' })
  async getStatus() {
    const status = await this.clusterService.getStatus();
    const memory = process.memoryUsage();
    return {
      success: true,
      data: {
        ...status,
        memoryUsage: {
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
          rssMb: Math.round(memory.rss / 1024 / 1024),
        },
      },
    };
  }

  @Post('scale-up')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Spawn secondary instance (Worker 2) for Exam High-Load Mode' })
  @ApiResponse({ status: 200, description: 'Worker 2 spawned successfully' })
  async scaleUp(@Body() body?: ScaleUpDto) {
    const duration = body?.durationMinutes || 120;
    const result = await this.clusterService.scaleUp(duration);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return {
      success: result.success,
      message: result.message,
      data: await this.clusterService.getStatus(),
    };
  }

  @Post('scale-down')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Gracefully shutdown secondary instance (Worker 2) to return to economic mode' })
  @ApiResponse({ status: 200, description: 'Worker 2 shutdown initiated' })
  async scaleDown() {
    const result = await this.clusterService.scaleDown();
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return {
      success: result.success,
      message: result.message,
      data: await this.clusterService.getStatus(),
    };
  }
}
