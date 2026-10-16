'use client';

import React from 'react';
import { ConfirmModal, ConfirmModalProps } from './ConfirmModal';

export interface ConfirmDialogProps extends ConfirmModalProps {
  /** Optional icon override */
  icon?: React.ReactNode;
}

/**
 * ConfirmDialog component:
 * Accessible, responsive confirmation dialog with keyboard support (Esc to dismiss, Enter/Auto-focus to confirm).
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      confirmText={confirmText}
      cancelLabel={cancelLabel}
      cancelText={cancelText}
      variant={variant}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
