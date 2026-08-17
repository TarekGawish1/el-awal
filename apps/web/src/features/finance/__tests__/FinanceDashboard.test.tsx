import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { usePayments, useGroupDefaulters } from '../hooks/useFinance';

// Mock dependencies
vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('../hooks/useFinance', () => ({
  usePayments: vi.fn(),
  useGroupDefaulters: vi.fn(),
  useDeletePayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRecordPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

describe('FinanceDashboard', () => {
  it('renders initial empty state when no group selected', () => {
    vi.mocked(useGroups).mockReturnValue({
      data: [{ id: 'group-1', name: 'Group 1', gradeLevel: 'G1' }],
      isLoading: false,
    } as any);

    vi.mocked(usePayments).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    vi.mocked(useGroupDefaulters).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    render(<FinanceDashboard />);
    
    // Group select should be there
    expect(screen.getByText('المجموعة')).toBeInTheDocument();
    
    // Empty state should be visible
    expect(screen.getByText('يرجى اختيار مجموعة')).toBeInTheDocument();
  });
});
