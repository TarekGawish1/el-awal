export type UserRole = 'TEACHER' | 'SECRETARIAT' | 'STUDENT' | 'PARENT';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}
