'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Phone, CheckCircle, UserX, Trash2 } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';

interface StudentProfileHeaderProps {
  student: any;
  studentName: string;
  studentPhone: string;
  updateStatusMutation: any;
  deleteStudentMutation: any;
}

export function StudentProfileHeader({
  student,
  studentName,
  studentPhone,
  updateStatusMutation,
  deleteStudentMutation,
}: StudentProfileHeaderProps) {
  const router = useRouter();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-transparent to-transparent"></div>
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-2 rtl:-mr-2 rtl:ml-0 text-slate-500 hover:text-slate-900 cursor-pointer">
            <svg className="w-5 h-5 mr-2 rtl:rotate-180 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            العودة لسجل الطلاب
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-2xl shadow-sm">
              {studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{studentName}</h1>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{student.studentCode || `STU-${student.id.slice(0, 6)}`}</span>
                <Badge variant={student.academicStatus === 'ACTIVE' ? 'success' : 'default'} className="px-3 py-1 text-xs font-bold">
                  {student.academicStatus === 'ACTIVE' ? 'نشط' : 
                   student.academicStatus === 'LEFT' ? 'غادر السنتر' :
                   student.academicStatus === 'GRADUATED' ? 'خريج' :
                   student.academicStatus === 'DROPPED_OUT' ? 'منسحب' :
                   student.academicStatus === 'SUSPENDED' ? 'موقوف' : (student.academicStatus || 'نشط')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {studentPhone && (
            <div className="flex items-center gap-2 bg-slate-50/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm">
              <a 
                href={`tel:${studentPhone.replace(/[^0-9+]/g, '')}`} 
                className="inline-flex items-center justify-center p-3 rounded-xl hover:bg-blue-100 transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                title="اتصال هاتفي"
              >
                <Phone className="w-5 h-5" />
              </a>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <a 
                href={`https://wa.me/${formatWhatsAppNumber(studentPhone)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-3 rounded-xl hover:bg-green-100 transition-colors text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                title="مراسلة عبر واتساب"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Management Bar */}
      <div className="relative z-10 mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 ml-1">تغيير حالة القيد:</span>
          <Button
            size="sm"
            variant={student.academicStatus === 'ACTIVE' ? 'primary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'ACTIVE' })}
            className="text-xs rounded-xl py-1"
          >
            <CheckCircle className="w-3.5 h-3.5 ml-1" />
            نشط
          </Button>
          <Button
            size="sm"
            variant={student.academicStatus === 'LEFT' ? 'secondary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'LEFT' })}
            className={`text-xs rounded-xl py-1 ${student.academicStatus === 'LEFT' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-amber-700 border-amber-200 hover:bg-amber-50'}`}
          >
            <UserX className="w-3.5 h-3.5 ml-1" />
            غادر السنتر
          </Button>
          <Button
            size="sm"
            variant={student.academicStatus === 'SUSPENDED' ? 'secondary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'SUSPENDED' })}
            className="text-xs rounded-xl py-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            موقوف مؤقتاً
          </Button>
          <Button
            size="sm"
            variant={student.academicStatus === 'ARCHIVED' ? 'secondary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'ARCHIVED' })}
            className="text-xs rounded-xl py-1 text-slate-600 border-slate-200 hover:bg-slate-100"
          >
            أرشفة
          </Button>
        </div>

        <div>
          {!isConfirmingDelete ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConfirmingDelete(true)}
              className="text-xs border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1" />
              حذف الطالب من النظام
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={deleteStudentMutation.isPending}
                onClick={() => {
                  deleteStudentMutation.mutate(student.id, {
                    onSuccess: () => {
                      router.push('/teacher/students');
                    },
                  });
                }}
                className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {deleteStudentMutation.isPending ? 'جاري الحذف...' : 'تأكيد حذف الطالب'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConfirmingDelete(false)}
                className="text-xs rounded-xl"
              >
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
