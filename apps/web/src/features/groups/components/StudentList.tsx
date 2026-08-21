'use client';

import { useState } from 'react';
import { UserMinus, AlertCircle, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { useGroupStudents } from '../hooks/useGroups';
import { RemoveStudentModal } from './RemoveStudentModal';
import { useRouter } from 'next/navigation';

interface StudentListProps {
  groupId: string;
}

export function StudentList({ groupId }: StudentListProps) {
  const router = useRouter();
  const { data: enrollments, isLoading, isError, error, refetch } = useGroupStudents(groupId);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);

  const filteredEnrollments = (enrollments || []).filter((enrollment) => {
    const name = (enrollment.student?.user?.name || (enrollment.student as any)?.fullName || '').toLowerCase();
    const code = (enrollment.student?.code || (enrollment.student as any)?.studentCode || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return name.includes(q) || code.includes(q);
  });

  if (isError) {
    return (
      <Alert variant="error">
        <AlertCircle className="w-5 h-5 ml-2" />
        <div className="flex-1">
          <p className="font-semibold">فشل في تحميل قائمة الطلاب</p>
          <p className="text-sm opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
          إعادة المحاولة
        </Button>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Users className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-1">لا يوجد طلاب في هذه المجموعة</h3>
        <p className="text-slate-500 text-sm">قم بإضافة طلاب للبدء في إدارة حضورهم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <Input
          className="pr-10 bg-white"
          placeholder="ابحث عن طالب بالاسم أو الكود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEnrollments.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-100">
          <p className="text-slate-500">لم يتم العثور على طلاب مطابقين لبحثك</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <tr>
                  <th className="py-3 px-4 font-medium">اسم الطالب</th>
                  <th className="py-3 px-4 font-medium">كود الطالب</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">رقم الهاتف</th>
                  <th className="py-3 px-4 font-medium text-center">نسبة الحضور</th>
                  <th className="py-3 px-4 font-medium text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((enrollment) => {
                  const studentName = enrollment.student?.user?.name || (enrollment.student as any)?.fullName || 'طالب';
                  const studentPhone = enrollment.student?.user?.phone || (enrollment.student as any)?.phone || '';
                  const studentCode = enrollment.student?.code || (enrollment.student as any)?.studentCode || `STU-${enrollment.student?.id?.slice(0, 6)}`;
                  const attendanceRate = enrollment.attendanceRate ?? 100;

                  return (
                    <tr 
                      key={enrollment.id || enrollment.student?.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/teacher/students/${enrollment.student?.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{studentName}</div>
                        {studentPhone && <div className="text-xs text-slate-500 md:hidden">{studentPhone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {studentCode}
                        </code>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-slate-600 text-sm">
                        <span dir="ltr">{studentPhone || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={attendanceRate >= 80 ? 'success' : attendanceRate >= 50 ? 'warning' : 'error'}>
                          {Math.round(attendanceRate)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentToRemove({ 
                              id: enrollment.student?.id, 
                              name: studentName,
                            });
                          }}
                        >
                          <UserMinus className="w-4 h-4 ml-1 md:ml-0 md:mr-1" />
                          <span className="hidden md:inline">إزالة</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {studentToRemove && (
        <RemoveStudentModal
          isOpen={true}
          onClose={() => setStudentToRemove(null)}
          groupId={groupId}
          studentId={studentToRemove.id}
          studentName={studentToRemove.name}
        />
      )}
    </div>
  );
}
