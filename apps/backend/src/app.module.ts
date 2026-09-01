import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from './core/core.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { RealtimeModule } from './realtime/realtime.module';

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
import { BookletsModule } from './modules/booklets/booklets.module';
import { SyncModule } from './modules/sync/sync.module';
import { HealthModule } from './modules/health/health.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { AcademicPeriodsModule } from './modules/academic-periods/academic-periods.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { AssistantsModule } from './modules/assistants/assistants.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // Foundational Core Subsystems (Config, Database, Security, Filters, Interceptors)
    CoreModule,

    // Asynchronous Event Bus
    EventEmitterModule.forRoot(),

    // External Cloud Integrations (Cloudflare R2, Bunny Stream)
    IntegrationsModule,

    // Realtime WebSocket transport (Socket.IO)
    RealtimeModule,

    // 15 Domain Feature Modules + Health + Audit
    AuthModule,
    UsersModule,
    StudentsModule,
    GroupsModule,
    TeachersModule,
    AcademicPeriodsModule,
    PaymentsModule,
    SchedulesModule,
    AttendanceModule,
    CoursesModule,
    ContentModule,
    AssessmentsModule,
    ParentPortalModule,
    NotificationsModule,
    SubscriptionsModule,
    BookletsModule,
    SyncModule,
    HealthModule,
    ContactMessagesModule,
    CertificatesModule,
    AssistantsModule,
    AuditModule,
  ],
})
export class AppModule {}
