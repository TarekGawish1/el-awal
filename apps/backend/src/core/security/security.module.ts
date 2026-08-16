import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, ResourceOwnershipGuard],
  exports: [PassportModule, JwtAuthGuard, RolesGuard, ResourceOwnershipGuard],
})
export class SecurityModule {}
