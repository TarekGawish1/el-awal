'use client';

import React from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  pendingCount: number;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function LogoutConfirmationModal({
  isOpen,
  pendingCount,
  onConfirm,
  onCancel,
}: LogoutConfirmationModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="تأكيد تسجيل الخروج"
      message={`لديك (${pendingCount}) تغييرات محلية لم تتم مزامنتها. تسجيل الخروج سيؤدي إلى حذفها نهائياً.`}
      confirmText="تأكيد وتسجيل الخروج"
      cancelText="إلغاء"
      variant="danger"
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
}
