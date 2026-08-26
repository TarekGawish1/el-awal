import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Register and onboard a new student with QR credential provisioning' })
  @ApiResponse({ status: 201, description: 'Student successfully onboarded' })
  async createStudent(@Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(dto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'List and search students with Keyset cursor pagination and stage filters' })
  async getStudents(
    @Query() query: StudentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.getStudents(query, user);
  }

  @Get('my-group')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get the authenticated student physical group, teacher, schedule, and monthly fee status' })
  async getMyGroup(
    @Query() query: StudentGroupQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.getMyGroup(user, query);
  }

  @Get('my-group/sessions')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get the authenticated student group sessions with attendance, homework, and session attachments' })
  async getMyGroupSessions(
    @Query() query: StudentGroupQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.getMyGroupSessions(user, query);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student demographic and academic profile by ID' })
  async getStudentById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.getStudentById(id, user);
  }

  @Get(':id/qr-code')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Retrieve QR credential badge payload for digital display' })
  @ApiResponse({ status: 200, type: StudentQrCodeResponseDto })
  async getStudentQrCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    return this.studentsService.getStudentQrCode(id, user);
  }

  @Post(':id/regenerate-qr-token')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Revoke old QR token and issue a fresh cryptographic roll-call token' })
  @ApiResponse({ status: 200, type: StudentQrCodeResponseDto })
  async regenerateQrToken(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    return this.studentsService.regenerateQrToken(id, user);
  }
}
