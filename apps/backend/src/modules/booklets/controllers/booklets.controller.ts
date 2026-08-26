import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookletsService } from '../services/booklets.service';
import { CreateBookletDto } from '../dto/create-booklet.dto';
import { UpdateBookletDto } from '../dto/update-booklet.dto';
import { BookletQueryDto } from '../dto/booklet-query.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Booklets & Study Notes Management')
@ApiBearerAuth()
@Controller('booklets')
export class BookletsController {
  constructor(private readonly bookletsService: BookletsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new booklet linked to grade level and group' })
  @ApiResponse({ status: 201, description: 'Booklet created successfully' })
  async create(
    @Body() dto: CreateBookletDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookletsService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'List booklets filtered by academic period, grade level, and group' })
  @ApiResponse({ status: 200, description: 'List of booklets with sales statistics' })
  async findAll(
    @Query() query: BookletQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookletsService.findAll(user, query);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get single booklet details and payment breakdown' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookletsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update title, price, grade, stock, or status of a booklet' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookletDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookletsService.update(id, user, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete or deactivate a booklet' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookletsService.delete(id, user);
  }
}
