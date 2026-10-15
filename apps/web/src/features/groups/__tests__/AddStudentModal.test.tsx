import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddStudentModal } from '../components/AddStudentModal';
import * as useGroupsModule from '../hooks/useGroups';

vi.mock('../hooks/useGroups', () => ({
  useAddStudent: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSearchStudents: vi.fn(() => ({ data: { data: [] }, isLoading: false, isError: false })),
  useGroupStudents: vi.fn(() => ({ data: [], isLoading: false })),
}));

describe('AddStudentModal Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('disables queries when modal is closed (isOpen=false)', () => {
    render(<AddStudentModal isOpen={false} groupId="grp-123" onClose={vi.fn()} />, { wrapper });

    expect(useGroupsModule.useGroupStudents).toHaveBeenCalledWith(
      'grp-123',
      expect.objectContaining({ enabled: false })
    );
    expect(useGroupsModule.useSearchStudents).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false })
    );
  });

  it('enables useGroupStudents query when modal is open (isOpen=true)', () => {
    render(<AddStudentModal isOpen={true} groupId="grp-123" onClose={vi.fn()} />, { wrapper });

    expect(useGroupsModule.useGroupStudents).toHaveBeenCalledWith(
      'grp-123',
      expect.objectContaining({ enabled: true })
    );
  });
});
