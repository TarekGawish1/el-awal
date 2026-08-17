'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStudents } from '../hooks/use-students';
import { AcademicStatus } from '../types/students.types';

export function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCursor(undefined); // Reset pagination on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError } = useStudents({
    search: debouncedSearch || undefined,
    cursor,
    limit: 10,
  });

  const getStatusColor = (status: AcademicStatus) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'GRADUATED': return 'info';
      case 'DROPPED_OUT': return 'warning';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: AcademicStatus) => {
    switch (status) {
      case 'ACTIVE': return 'نشط';
      case 'GRADUATED': return 'خريج';
      case 'DROPPED_OUT': return 'منسحب';
      case 'SUSPENDED': return 'موقوف';
      default: return status;
    }
  };

  const handleNextPage = () => {
    if (data?.meta.hasMore && data?.meta.nextCursor) {
      setCursor(data.meta.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (data?.meta.prevCursor) {
      setCursor(data.meta.prevCursor);
    } else {
      setCursor(undefined); // Going back to first page
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:w-96">
          <svg className="absolute w-5 h-5 text-slate-400 right-3 top-1/2 -translate-y-1/2 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="search"
            placeholder="ابحث بالاسم، رقم الهاتف أو الكود..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border-none focus:ring-2 focus:ring-primary-500/20 rounded-xl transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-5 font-semibold text-slate-600 text-start whitespace-nowrap">اسم الطالب</th>
                <th className="px-6 py-5 font-semibold text-slate-600 text-start whitespace-nowrap">كود الطالب</th>
                <th className="px-6 py-5 font-semibold text-slate-600 text-start whitespace-nowrap">المجموعة</th>
                <th className="px-6 py-5 font-semibold text-slate-600 text-start whitespace-nowrap">الحالة</th>
                <th className="px-6 py-5 font-semibold text-slate-600 text-end whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>جاري تحميل الطلاب...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-500 bg-red-50/50">
                    فصل تحميل الطلاب. يرجى المحاولة مرة أخرى.
                  </td>
                </tr>
              ) : !data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-base">{debouncedSearch ? 'لا يوجد طلاب مطابقين لبحثك.' : 'لم يتم العثور على طلاب.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((student) => (
                  <tr key={student.id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <Link href={`/teacher/students/${student.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                          {student.user.fullName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                          {student.user.fullName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs">
                        {student.studentCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.groupEnrollments[0]?.group.name || <span className="text-slate-400 italic">غير معين</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(student.academicStatus)} className="px-3 py-1 text-xs">
                        {getStatusText(student.academicStatus)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Link href={`/teacher/students/${student.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 hover:text-primary-700 hover:bg-primary-50">
                          عرض التفاصيل
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {data && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevPage} 
              disabled={!cursor}
              className="rounded-xl"
            >
              السابق
            </Button>
            <span className="text-sm text-slate-500">
              نتائج الصفحة
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextPage} 
              disabled={!data.meta.hasMore}
              className="rounded-xl"
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
