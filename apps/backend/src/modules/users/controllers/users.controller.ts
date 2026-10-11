import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get profile information of currently authenticated user' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/badges')
  @ApiOperation({ summary: 'Get aggregated layout shell notification, inquiry, and reservation counter badges' })
  async getMyBadges(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getBadges(user);
  }
}

