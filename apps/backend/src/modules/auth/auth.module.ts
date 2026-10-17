import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthCredentialsService } from './services/auth-credentials.service';
import { AuthGroupRegistrationService } from './services/auth-group-registration.service';
import { StudentRegistrationService } from './services/student-registration.service';
import { AuthVerificationService } from './services/auth-verification.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthTokenService,
    AuthSessionService,
    AuthCredentialsService,
    AuthGroupRegistrationService,
    AuthService,
    StudentRegistrationService,
    AuthVerificationService,
  ],
  exports: [
    AuthTokenService,
    AuthSessionService,
    AuthCredentialsService,
    AuthGroupRegistrationService,
    AuthService,
    JwtModule,
    AuthVerificationService,
  ],
})
export class AuthModule {}
