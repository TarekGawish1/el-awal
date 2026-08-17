'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useStudentQrCode, useRegenerateStudentQr } from '../hooks/use-students';
import { Button } from '@/components/ui/Button';

interface StudentQrBadgeProps {
  studentId: string;
}

export function StudentQrBadge({ studentId }: StudentQrBadgeProps) {
  const { data, isLoading, isError } = useStudentQrCode(studentId);
  const { mutate: regenerate, isPending: isRegenerating } = useRegenerateStudentQr();
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div className="w-32 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
        Failed to load QR code.
      </div>
    );
  }

  const handleRegenerate = () => {
    regenerate(studentId, {
      onSuccess: () => setShowConfirm(false),
    });
  };

  return (
    <div className="flex flex-col items-center p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="bg-white p-4 rounded-lg shadow-inner border mb-4">
        <QRCode value={data.qrCodeToken} size={200} />
      </div>
      
      <h3 className="text-xl font-bold mb-1">{data.fullName}</h3>
      <p className="text-gray-500 dark:text-gray-400 font-mono text-sm mb-6">
        {data.studentCode}
      </p>

      {showConfirm ? (
        <div className="flex flex-col items-center space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg w-full max-w-sm">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-medium">
            This will invalidate the current QR badge. Proceed?
          </p>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? 'Regenerating...' : 'Confirm'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowConfirm(true)}
        >
          Regenerate QR Token
        </Button>
      )}
    </div>
  );
}
