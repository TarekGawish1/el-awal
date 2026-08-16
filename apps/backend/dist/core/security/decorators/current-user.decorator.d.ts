import { UserRole } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    email?: string;
    phone?: string;
    role: UserRole;
    teacherProfileId?: string;
    studentProfileId?: string;
    parentProfileId?: string;
    secretariatProfileId?: string;
}
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof AuthenticatedUser)[]) => ParameterDecorator;
