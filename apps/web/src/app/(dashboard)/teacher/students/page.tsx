'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { StudentList } from '@/features/students/components/StudentList';
import { CreateStudentForm } from '@/features/students/components/CreateStudentForm';
import { StudentQrBadge } from '@/features/students/components/StudentQrBadge';
import StudentDetailPage from './[id]/page';
import { Button } from '@/components/ui/Button';

export default function TeacherStudentsPage() {
  const pathname = usePathname();
  const [isCreating, setIsCreating] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{ id: string; password?: string; email?: string; phone?: string } | null>(null);

  // If a subpath is loaded (e.g. offline reload of /teacher/students/[id] where SW serves parent document)
  const pathParts = pathname?.split('/').filter(Boolean) || [];
  const directStudentId = pathParts.length >= 3 && pathParts[1] === 'students' ? pathParts[2] : null;

  if (directStudentId) {
    return <StudentDetailPage params={{ id: directStudentId }} />;
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">سجل الطلاب</h1>
            <p className="mt-1 sm:mt-3 text-slate-500 text-sm sm:text-lg">
              إدارة بيانات وسجلات جميع الطلاب.
            </p>
          </div>
          {!isCreating && !createdStudent && (
            <Button className="w-full sm:w-auto rounded-xl px-6" onClick={() => setIsCreating(true)}>
              <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة طالب
            </Button>
          )}
        </div>
      </div>

      {isCreating ? (
        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">تسجيل طالب جديد</h2>
          <CreateStudentForm
            onSuccess={(data, password, parentPhone) => {
              if (data?.id) {
                setCreatedStudent({
                  id: data.id,
                  password: password,
                  email: data.email,
                  phone: data.phone || parentPhone
                });
              }
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : createdStudent ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-col items-center">
          <div className="w-full max-w-sm mb-6">
            <StudentQrBadge
              studentId={createdStudent.id}
              studentPhone={createdStudent.phone}
              loginPassword={createdStudent.password}
              loginEmail={createdStudent.email}
              loginPhone={createdStudent.phone}
            />
          </div>
          <Button 
            className="px-8 rounded-xl"
            onClick={() => setCreatedStudent(null)}
          >
            العودة لسجل الطلاب
          </Button>
        </div>
      ) : (
        <StudentList />
      )}
    </div>
  );
}
