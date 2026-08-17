import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from './core/core.module';
import { IntegrationsModule } from './integrations/integrations.module';

// Domain Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { GroupsModule } from './modules/groups/groups.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ContentModule } from './modules/content/content.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ParentPortalModule } from './modules/parent-portal/parent-portal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SyncModule } from './modules/sync/sync.module';
import { HealthModule } from './modules/health/health.module';
import { TeachersModule } from './modules/teachers/teachers.module';

@Module({
  imports: [
    // Foundational Core Subsystems (Config, Database, Security, Filters, Interceptors)
    CoreModule,

    // Asynchronous Event Bus
    EventEmitterModule.forRoot(),

    // External Cloud Integrations (Cloudflare R2, Bunny Stream)
    IntegrationsModule,

    // 14 Domain Feature Modules + Health
    AuthModule,
    UsersModule,
    StudentsModule,
    GroupsModule,
    TeachersModule,
    SchedulesModule,
    AttendanceModule,
    CoursesModule,
    ContentModule,
    AssessmentsModule,
    ParentPortalModule,
    NotificationsModule,
    SubscriptionsModule,
    SyncModule,
    HealthModule,
  ],
})
export class AppModule {}
