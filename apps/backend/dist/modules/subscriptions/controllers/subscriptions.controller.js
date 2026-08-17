"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const subscriptions_service_1 = require("../services/subscriptions.service");
const record_payment_dto_1 = require("../dto/record-payment.dto");
const payment_query_dto_1 = require("../dto/payment-query.dto");
const roles_decorator_1 = require("../../../core/security/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../core/security/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async recordPayment(dto, user) {
        return this.subscriptionsService.recordStudentPayment(user, dto);
    }
    async getPaymentLog(query, user) {
        return this.subscriptionsService.getPaymentLog(query, user);
    }
    async getStudentPaymentHistory(studentId, user) {
        return this.subscriptionsService.getStudentPaymentHistory(studentId, user);
    }
    async getGroupDefaulters(groupId, periodYear, periodMonth, user) {
        return this.subscriptionsService.getGroupDefaulters(groupId, periodYear, periodMonth, user);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('record'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SECRETARIAT, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Record or update physical student tuition payment' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment recorded and notification event emitted' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_payment_dto_1.RecordPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SECRETARIAT, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'List payment audit log with Keyset cursor pagination and period filters' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_query_dto_1.PaymentQueryDto, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getPaymentLog", null);
__decorate([
    (0, common_1.Get)('student/:studentId'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SECRETARIAT, client_1.UserRole.TEACHER, client_1.UserRole.PARENT, client_1.UserRole.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get billing and payment history for a student' }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getStudentPaymentHistory", null);
__decorate([
    (0, common_1.Get)('group/:groupId/defaulters'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SECRETARIAT, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'List enrolled students with unpaid tuition fees for a specific billing month' }),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Query)('periodYear', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('periodMonth', common_1.ParseIntPipe)),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getGroupDefaulters", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('Subscriptions & Tuition Payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map