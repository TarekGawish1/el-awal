import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
export interface OwnershipOptions {
    paramName?: string;
    allowRoles?: UserRole[];
}
export declare const RESOURCE_OWNERSHIP_KEY = "resourceOwnership";
export declare const CheckOwnership: (options?: OwnershipOptions) => import("@nestjs/common").CustomDecorator<string>;
export declare class ResourceOwnershipGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
