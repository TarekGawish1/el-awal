import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { useAuthStore } from './src/features/auth/store/auth.store';

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'default-test-user-id', fullName: 'المعلم التجريبي', role: 'TEACHER' } as any,
    isAuthenticated: true,
    isInitialized: true,
  });
});
