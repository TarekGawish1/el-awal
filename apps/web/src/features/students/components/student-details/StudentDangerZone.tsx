'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Trash2 } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

interface StudentDangerZoneProps {
  studentName: string;
  isConfirmingDelete: boolean;
  setIsConfirmingDelete: (val: boolean) => void;
  deleteStudentMutation: UseMutationResult<any, any, any, any>;
  onDeleteStudent: () => void;
}

export function StudentDangerZone({
  studentName,
  isConfirmingDelete,
  setIsConfirmingDelete,
  deleteStudentMutation,
  onDeleteStudent,
}: StudentDangerZoneProps) {
  return (
    <>
      <section className="mt-12 pt-8 border-t border-slate-200/60 border-dashed">
        <div className="bg-red-50/40 p-5 rounded-2xl border border-red-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-red-800 flex items-center gap-1.5 mb-1">
              <Trash2 className="w-4 h-4" />
              منطقة خطرة: حذف الطالب نهائياً
            </h4>
            <p className="text-xs text-red-600/80 max-w-lg">
              سيؤدي حذف الطالب إلى حذفه من كافة المجموعات وإزالة سجل حضوره وغيابه. لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsConfirmingDelete(true)}
            className="shrink-0 bg-white border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl font-bold shadow-sm cursor-pointer"
          >
            حذف الطالب
          </Button>
        </div>
      </section>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        title="تأكيد حذف الطالب نهائياً"
        message={`هل أنت متأكد من رغبتك في حذف الطالب "${studentName}"؟ سيؤدي ذلك إلى حذف كافة بياناته وسجل حضوره ولا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={deleteStudentMutation.isPending ? "جاري الحذف..." : "نعم، احذف الطالب"}
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={onDeleteStudent}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}
