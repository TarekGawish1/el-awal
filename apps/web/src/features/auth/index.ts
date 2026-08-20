export { LoginForm } from './components/LoginForm';
export { LoginContainer } from './components/LoginContainer';
export { ParentAccessForm } from './components/ParentAccessForm';
export { StudentRegistrationForm } from './components/StudentRegistrationForm';
export { useAuth, normalizeAuthErrorMessage } from './hooks/useAuth';
export { useParentAccess, normalizeParentAccessError } from './hooks/useParentAccess';
export { useStudentRegistration, normalizeStudentRegistrationError } from './hooks/useStudentRegistration';
export { useAuthStore } from './store/auth.store';
export { loginUser, parentAccessUser, logoutUser, fetchCurrentUser, verifyStudentRegistration, registerStudentAccount } from './api/auth.api';
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
  StudentRegistrationVerification,
  StudentVerificationResponse,
  StudentAccountCredentials,
  AuthTokensResponse,
  AuthState,
} from './types/auth.types';
