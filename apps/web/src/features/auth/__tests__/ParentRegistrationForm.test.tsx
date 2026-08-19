import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ParentRegistrationForm } from '../components/ParentRegistrationForm';

describe('ParentRegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a phone-only registration form', () => {
    render(<ParentRegistrationForm />);

    expect(screen.getByLabelText('رقم الهاتف*')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'متابعة تسجيل ولي الأمر' })).toBeInTheDocument();
  });

  it('validates the phone number before showing the completion state', () => {
    render(<ParentRegistrationForm />);

    fireEvent.click(screen.getByRole('button', { name: 'متابعة تسجيل ولي الأمر' }));
    expect(screen.getByText('يرجى إدخال رقم الهاتف')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('رقم الهاتف*'), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'متابعة تسجيل ولي الأمر' }));

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('تم استلام رقم الهاتف')).toBeInTheDocument();
  });
});
