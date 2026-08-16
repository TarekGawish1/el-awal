import { UserRole } from '@prisma/client';
export declare class AuthUserDto {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    teacherProfileId?: string;
    studentProfileId?: string;
    parentProfileId?: string;
    secretariatProfileId?: string;
}
export declare class AuthTokensResponseDto {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    user: AuthUserDto;
}
