export type UserRole = 'TEACHER' | 'SECRETARIAT' | 'STUDENT' | 'PARENT';

export interface LoginCredentials {
  identifier: string; // Email or Phone Number
  password: string;
}

export interface ParentAccessCredentials {
  studentPhone: string;
}

export interface StudentRegistrationVerification {
  studentCode: string;
  registrationCode: string;
}

export interface StudentVerificationResponse {
  registrationToken: string;
  studentCode: string;
  fullName: string;
  gradeLevel: string;
}

export interface StudentAccountCredentials {
  registrationToken: string;
  phone?: string;
  email?: string;
  password: string;
}

export interface AuthUser {
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

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}
