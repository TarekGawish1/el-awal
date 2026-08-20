export type UserRole = 'TEACHER' | 'SECRETARIAT' | 'STUDENT' | 'PARENT';

export interface LoginCredentials {
  identifier: string; // Email or Phone Number
  password: string;
}

export interface ParentAccessCredentials {
  studentPhone: string;
}

export type AcademicStage = 'PRIMARY' | 'MIDDLE' | 'SECONDARY';

export interface StudentRegistrationPayload {
  fullName: string;
  studentPhone: string;
  parentPhone: string;
  academicStage: AcademicStage;
  gradeLevel: string;
}

export interface StudentRegistrationCredentials {
  studentCode: string;
  studentPhone: string;
  studentPassword: string;
  parentPhone: string;
  parentPassword: string | null;
  parentIsNew: boolean;
}

export interface StudentRegistrationResult extends AuthTokensResponse {
  credentials: StudentRegistrationCredentials;
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
