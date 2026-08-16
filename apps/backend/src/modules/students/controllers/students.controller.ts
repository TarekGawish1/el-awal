import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from '../services/students.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student demographic and academic profile by ID' })
  async getStudentById(@Param('id') id: string) {
    return this.studentsService.getStudentById(id);
  }
}
