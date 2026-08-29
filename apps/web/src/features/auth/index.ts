export { LoginForm } from './components/LoginForm';
export { LoginContainer } from './components/LoginContainer';
export { ParentAccessForm } from './components/ParentAccessForm';
export { StudentRegistrationForm } from './components/StudentRegistrationForm';
export { GroupRegistrationForm } from './components/GroupRegistrationForm';
export { GroupInviteRegistrationView } from './components/GroupInviteRegistrationView';
export { useAuth, normalizeAuthErrorMessage } from './hooks/useAuth';
export { useParentAccess, normalizeParentAccessError } from './hooks/useParentAccess';
export { useStudentRegistration, normalizeStudentRegistrationError } from './hooks/useStudentRegistration';
export { useGroupInvite, useGroupRegistration, normalizeGroupRegistrationError } from './hooks/useGroupRegistration';
export { useAuthStore } from './store/auth.store';
export { loginUser, parentAccessUser, logoutUser, fetchCurrentUser, registerStudent, fetchGroupInvite, registerByGroup } from './api/auth.api';
export {
  setStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  clearStoredTokens,
} from './utils/auth-tokens';
export { getRoleLandingRoute, sanitizeRedirectUrl } from './utils/role-routing';
export type {
  UserRole,
  AuthUser,
  LoginCredentials,
  ParentAccessCredentials,
  AcademicStage,
  StudentRegistrationPayload,
  StudentRegistrationCredentials,
  StudentRegistrationResult,
  GroupInviteInfo,
  GroupRegistrationPayload,
  AuthTokensResponse,
  AuthState,
} from './types/auth.types';
