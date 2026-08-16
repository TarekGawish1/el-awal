"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const core_module_1 = require("./core/core.module");
const integrations_module_1 = require("./integrations/integrations.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const students_module_1 = require("./modules/students/students.module");
const groups_module_1 = require("./modules/groups/groups.module");
const schedules_module_1 = require("./modules/schedules/schedules.module");
const attendance_module_1 = require("./modules/attendance/attendance.module");
const courses_module_1 = require("./modules/courses/courses.module");
const content_module_1 = require("./modules/content/content.module");
const assessments_module_1 = require("./modules/assessments/assessments.module");
const parent_portal_module_1 = require("./modules/parent-portal/parent-portal.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const sync_module_1 = require("./modules/sync/sync.module");
const health_module_1 = require("./modules/health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_module_1.CoreModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            integrations_module_1.IntegrationsModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            students_module_1.StudentsModule,
            groups_module_1.GroupsModule,
            schedules_module_1.SchedulesModule,
            attendance_module_1.AttendanceModule,
            courses_module_1.CoursesModule,
            content_module_1.ContentModule,
            assessments_module_1.AssessmentsModule,
            parent_portal_module_1.ParentPortalModule,
            notifications_module_1.NotificationsModule,
            subscriptions_module_1.SubscriptionsModule,
            sync_module_1.SyncModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map