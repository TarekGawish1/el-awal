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

  it('renders a secure parent access form with identifier and password inputs', () => {
    render(<ParentAccessForm />);

    expect(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دخول ولي الأمر' })).toBeInTheDocument();
  });

  it('validates the student phone number and password before submitting', () => {
    render(<ParentAccessForm />);

    fireEvent.click(screen.getByRole('button', { name: 'دخول ولي الأمر' }));
    expect(screen.getByText('يرجى إدخال رقم الهاتف أو كود الطالب')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال كلمة المرور')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/i), { target: { value: 'secretpass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'دخول ولي الأمر' }));

    expect(screen.getByLabelText(/رقم الهاتف أو كود الطالب/i)).toHaveValue('01012345678');
    expect(screen.getByLabelText(/كلمة المرور/i)).toHaveValue('secretpass123');
    expect(mockAccessParent).toHaveBeenCalledWith({
      studentPhone: '01012345678',
      password: 'secretpass123',
    });
  });

  it('shows the server error when credentials are invalid', () => {
    vi.spyOn(parentAccessHook, 'useParentAccess').mockReturnValue({
      accessParent: mockAccessParent,
      isLoading: false,
      isError: true,
      error: 'كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور أو استخدام رابط الدخول الآمن',
      resetError: vi.fn(),
    });

    render(<ParentAccessForm />);

    expect(screen.getByText('تعذر الدخول')).toBeInTheDocument();
    expect(screen.getByText('كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور أو استخدام رابط الدخول الآمن')).toBeInTheDocument();
  });
});
