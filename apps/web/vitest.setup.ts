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

import React from 'react';

vi.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: (loader: any, options?: any) => {
      let resolvedComponent: any = null;
      try {
        const promise = typeof loader === 'function' ? loader() : null;
        if (promise && typeof promise.then === 'function') {
          promise.then((val: any) => {
            resolvedComponent = val?.default || val;
          });
        }
      } catch (err) {
        // ignore
      }

      const DynamicWrapper = (props: any) => {
        if (resolvedComponent) {
          return React.createElement(resolvedComponent, props);
        }
        return options?.loading ? options.loading() : null;
      };
      DynamicWrapper.displayName = 'DynamicComponentWrapper';
      return DynamicWrapper;
    },
  };
});
