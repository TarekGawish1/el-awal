import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/guards/roles.guard';
import { CreateTestimonialDto } from '../dto/create-testimonial.dto';
import { UpdateTestimonialDto } from '../dto/update-testimonial.dto';
import { TestimonialsService } from '../services/testimonials.service';

@ApiTags('Testimonials')
@Controller('testimonials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit a testimonial for moderation' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTestimonialDto) {
    return this.testimonialsService.createForStudent(user, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get the current student’s latest testimonial submission' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.testimonialsService.findMine(user);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get approved testimonials for public display' })
  findPublic() {
    return this.testimonialsService.findPublic();
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all testimonial submissions for moderation' })
  findAll() {
    return this.testimonialsService.findAll();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update testimonial content, rating, or moderation status' })
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, dto);
  }
}
