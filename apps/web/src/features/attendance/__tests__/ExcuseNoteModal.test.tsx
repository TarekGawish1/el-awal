import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExcuseNoteModal } from '../components/ExcuseNoteModal';

describe('ExcuseNoteModal', () => {
  it('renders student info and quick excuse options', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExcuseNoteModal
        isOpen={true}
        onClose={handleClose}
        studentName="يوسف حسن مصطفى"
        studentCode="STU-2026-0004"
        onSave={handleSave}
      />
    );

    expect(screen.getByText('تسجيل عذر غياب')).toBeInTheDocument();
    expect(screen.getByText('يوسف حسن مصطفى')).toBeInTheDocument();
    expect(screen.getByText(/STU-2026-0004/)).toBeInTheDocument();
    expect(screen.getByText('عذر مرضي 🏥')).toBeInTheDocument();
  });

  it('selects quick excuse and submits on confirm', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExcuseNoteModal
        isOpen={true}
        onClose={handleClose}
        studentName="يوسف حسن مصطفى"
        studentCode="STU-2026-0004"
        onSave={handleSave}
      />
    );

    // Click quick excuse button
    fireEvent.click(screen.getByText('عذر مرضي 🏥'));

    // Click submit button
    fireEvent.click(screen.getByRole('button', { name: /تأكيد وحفظ العذر/i }));

    expect(handleSave).toHaveBeenCalledWith('عذر مرضي 🏥');
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows typing custom excuse note', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExcuseNoteModal
        isOpen={true}
        onClose={handleClose}
        studentName="مريم إبراهيم"
        onSave={handleSave}
      />
    );

    const textarea = screen.getByPlaceholderText(/اكتب سبب العذر أو ملاحظات المدرس هنا/i);
    fireEvent.change(textarea, { target: { value: 'إجراء عملية جراحية بسيطة' } });

    fireEvent.click(screen.getByRole('button', { name: /تأكيد وحفظ العذر/i }));

    expect(handleSave).toHaveBeenCalledWith('إجراء عملية جراحية بسيطة');
  });
});
