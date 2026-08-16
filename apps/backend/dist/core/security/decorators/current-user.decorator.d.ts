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
export declare const CurrentUser: (...dataOrPipes: (keyof AuthenticatedUser | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
