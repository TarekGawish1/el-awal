import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ParentAccessForm } from '../components/ParentAccessForm';

describe('ParentAccessForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a phone-only registration form', () => {
    render(<ParentAccessForm />);

    expect(screen.getByLabelText(/رقم هاتف الطالب المسجل/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' })).toBeInTheDocument();
  });

  it('validates the phone number before showing the completion state', () => {
    render(<ParentAccessForm />);

    fireEvent.click(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' }));
    expect(screen.getByText('يرجى إدخال رقم هاتف الطالب')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/رقم هاتف الطالب المسجل/i), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'متابعة دخول ولي الأمر' }));

    expect(screen.getByLabelText(/رقم هاتف الطالب المسجل/i)).toHaveValue('01012345678');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
