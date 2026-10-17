'use client';

import React, { useState } from 'react';
import { X, KeyRound, User, Users } from 'lucide-react';
import {
  useStudentCredentials,
  useResetStudentPassword,
  useResetParentPassword,
} from '../hooks/use-students';
import { StudentCredentialsTab } from './password-modal/StudentCredentialsTab';
import { ParentCredentialsTab } from './password-modal/ParentCredentialsTab';

interface StudentPasswordModalProps {
  studentId: string | null;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'student' | 'parent';
}

export function StudentPasswordModal({
  studentId,
  studentName = 'الطالب',
  isOpen,
  onClose,
  initialTab = 'student',
}: StudentPasswordModalProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'parent'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const { data: credentials, refetch } = useStudentCredentials(
    studentId || '',
    isOpen,
  );
  const { mutate: resetPassword, isPending: isStudentPending } = useResetStudentPassword();
  const { mutate: resetParentPassword, isPending: isParentPending } = useResetParentPassword();

  if (!isOpen || !studentId) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="إدارة كلمة المرور وبيانات الدخول"
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600 border border-amber-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">كلمة المرور وبيانات الدخول</h2>
              <p className="text-xs text-slate-500 mt-0.5">{credentials?.studentName || studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Student vs Parent */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'student'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 text-primary-600" />
            <span>حساب الطالب</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'parent'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>حساب ولي الأمر</span>
            {credentials?.parentPassword && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="كلمة المرور مسجلة" />
            )}
          </button>
        </div>

        {/* TAB 1: STUDENT CREDENTIALS */}
        {activeTab === 'student' && (
          <StudentCredentialsTab
            credentials={credentials}
            studentId={studentId}
            studentName={studentName}
            resetPassword={resetPassword}
            isStudentPending={isStudentPending}
            refetch={refetch}
          />
        )}

        {/* TAB 2: PARENT CREDENTIALS */}
        {activeTab === 'parent' && (
          <ParentCredentialsTab
            credentials={credentials}
            studentId={studentId}
            studentName={studentName}
            resetParentPassword={resetParentPassword}
            isParentPending={isParentPending}
            refetch={refetch}
          />
        )}
      </div>
    </div>
  );
}

export default StudentPasswordModal;
