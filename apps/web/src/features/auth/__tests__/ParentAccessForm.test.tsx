import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ParentAccessForm } from '../components/ParentAccessForm';
import * as parentAccessHook from '../hooks/useParentAccess';

vi.mock('../hooks/useParentAccess', () => ({
  useParentAccess: vi.fn(),
}));

describe('ParentAccessForm', () => {
  const mockAccessParent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(parentAccessHook, 'useParentAccess').mockReturnValue({
      accessParent: mockAccessParent,
      isLoading: false,
      isError: false,
      error: null,
      resetError: vi.fn(),
    });
  });

  it('renders a phone-only parent access form', () => {
    render(<ParentAccessForm />);

    expect(screen.getByLabelText(/رقم هاتف الطالب المسجل/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' })).toBeInTheDocument();
  });

  it('validates the student phone number before submitting', () => {
    render(<ParentAccessForm />);

    fireEvent.click(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' }));
    expect(screen.getByText('يرجى إدخال رقم هاتف الطالب')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/رقم هاتف الطالب المسجل/i), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' }));

    expect(screen.getByLabelText(/رقم هاتف الطالب المسجل/i)).toHaveValue('01012345678');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mockAccessParent).toHaveBeenCalledWith('01012345678');
  });

  it('shows the server error when the student is not registered or linked', () => {
    vi.spyOn(parentAccessHook, 'useParentAccess').mockReturnValue({
      accessParent: mockAccessParent,
      isLoading: false,
      isError: true,
      error: 'رقم الطالب غير مسجل أو لا يوجد ولي أمر مرتبط به',
      resetError: vi.fn(),
    });

    render(<ParentAccessForm />);

    expect(screen.getByText('تعذر الدخول')).toBeInTheDocument();
    expect(screen.getByText('رقم الطالب غير مسجل أو لا يوجد ولي أمر مرتبط به')).toBeInTheDocument();
  });
});
