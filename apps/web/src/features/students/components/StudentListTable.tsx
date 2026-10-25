'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreatorBadge } from '@/components/ui/CreatorBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RotateCcw, Eye } from 'lucide-react';
import { AcademicStatus, StudentListItem } from '../types/students.types';
import { StudentJoiningCell } from './table/StudentJoiningCell';
import { StudentMobileCard } from './table/StudentMobileCard';

interface StudentListTableProps {
  isLoading: boolean;
  isError: boolean;
  filteredStudents: StudentListItem[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
  onSelectStudent: (studentId: string) => void;
  getStatusColor: (status: AcademicStatus | string) => any;
  getStatusText: (status: AcademicStatus | string) => string;
}

export function StudentListTable({
  isLoading,
  isError,
  filteredStudents,
  hasActiveFilters,
  resetFilters,
  onSelectStudent,
  getStatusColor,
  getStatusText,
}: StudentListTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm text-xs">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">اسم الطالب</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">رقم الهاتف</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">كود الطالب</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">المرحلة الدراسية</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">المجموعة</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">تاريخ وطريقة الانضمام</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">ولي الأمر</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">الحالة</th>
              <th className="px-4 py-3 font-bold text-slate-700 text-center whitespace-nowrap w-28">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 w-32 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-8 w-16 rounded-lg mx-auto" /></td>
                  </tr>
                ))}
              </>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-red-500 bg-red-50/50">
                  فشل تحميل الطلاب. يرجى المحاولة مرة أخرى.
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-20 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-slate-600">
                      {hasActiveFilters ? 'لا يوجد طلاب مطابقين لخيارات الفلترة المحددة.' : 'لم يتم العثور على طلاب.'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
                        <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                        إعادة تعيين الفلاتر
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  className="group hover:bg-primary-50/40 hover:shadow-xs transition-all duration-150 cursor-pointer"
                  title="اضغط لعرض تفاصيل الطالب وسجله الكامل"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs group-hover:text-primary-600 transition-colors">
                          {student.user.fullName}
                        </span>
                        <span className="inline-flex items-center text-[10px] text-primary-600 font-semibold opacity-0 group-hover:opacity-100 transition-all transform -translate-x-1 group-hover:translate-x-0">
                          <Eye className="w-3 h-3 text-primary-500" />
                        </span>
                      </div>
                      <CreatorBadge
                        createdByName={(student as any).createdByName}
                        updatedByName={(student as any).updatedByName}
                        compact
                        className="mt-0.5"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-slate-600 font-mono" dir="ltr">
                      {student.user.phone || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200/60 group-hover:bg-white group-hover:border-primary-200 transition-colors">
                      {student.studentCode}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">
                    {student.gradeLevel || <span className="text-slate-400 italic">-</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">
                    {student.groupEnrollments?.[0]?.group?.name ? (
                      <span title={student.groupEnrollments[0].group.name}>
                        {student.groupEnrollments[0].group.name.split('(')[0].trim()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        غير معين
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StudentJoiningCell
                      createdAt={student.createdAt}
                      createdByName={(student as any).createdByName}
                      groupEnrollments={student.groupEnrollments}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    {student.parentLinks?.[0]?.parent.user ? (
                      <span className="text-xs font-mono text-slate-600" dir="ltr">
                        {student.parentLinks[0].parent.user.phone || '—'}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={getStatusColor(student.academicStatus)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm"
                    >
                      {getStatusText(student.academicStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-primary-700 bg-slate-100/80 group-hover:bg-primary-100/80 px-2.5 py-1 rounded-lg transition-all duration-150 border border-slate-200/60 group-hover:border-primary-200 shadow-2xs">
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 transition-colors" />
                      <span>عرض التفاصيل</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (Optimized for Phone Screens) */}
      <div className="block md:hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-50">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-red-500 bg-red-50/50 text-sm">
            فشل تحميل الطلاب. يرجى المحاولة مرة أخرى.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-600">
              {hasActiveFilters ? 'لا يوجد طلاب مطابقين لخيارات الفلترة.' : 'لم يتم العثور على طلاب.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                إعادة تعيين الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <StudentMobileCard
                key={student.id}
                student={student}
                onSelectStudent={onSelectStudent}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
