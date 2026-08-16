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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceOwnershipGuard = exports.CheckOwnership = exports.RESOURCE_OWNERSHIP_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
exports.RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';
const CheckOwnership = (options = {}) => (0, common_1.SetMetadata)(exports.RESOURCE_OWNERSHIP_KEY, options);
exports.CheckOwnership = CheckOwnership;
let ResourceOwnershipGuard = class ResourceOwnershipGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const options = this.reflector.getAllAndOverride(exports.RESOURCE_OWNERSHIP_KEY, [context.getHandler(), context.getClass()]);
        if (!options) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User context is missing');
        }
        const defaultBypassRoles = [client_1.UserRole.SECRETARIAT];
        const allowedRoles = options.allowRoles || defaultBypassRoles;
        if (allowedRoles.includes(user.role)) {
            return true;
        }
        const paramName = options.paramName || 'id';
        const targetResourceId = request.params[paramName];
        if (!targetResourceId) {
            return true;
        }
        const matchesUser = targetResourceId === user.id ||
            targetResourceId === user.teacherProfileId ||
            targetResourceId === user.studentProfileId ||
            targetResourceId === user.parentProfileId;
        if (!matchesUser) {
            throw new common_1.ForbiddenException('BOLA / IDOR Violation: You do not have permission to access or modify this specific resource.');
        }
        return true;
    }
};
exports.ResourceOwnershipGuard = ResourceOwnershipGuard;
exports.ResourceOwnershipGuard = ResourceOwnershipGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], ResourceOwnershipGuard);
//# sourceMappingURL=resource-ownership.guard.js.map