'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudent } from '@/features/students/hooks/use-students';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StudentQrBadge } from '@/features/students/components/StudentQrBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Phone } from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const { data: student, isLoading, isError } = useStudent(studentId);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between gap-6">
           <div className="space-y-4 w-1/2">
             <Skeleton className="h-10 w-32 mb-8" />
             <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-32" />
                </div>
             </div>
           </div>
           <Skeleton className="w-48 h-48 rounded-xl hidden sm:block" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          Failed to load student details or student not found.
        </div>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header section with nice background pattern or gradient */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-2 rtl:-mr-2 rtl:ml-0 text-slate-500 hover:text-slate-900">
              <svg className="w-5 h-5 mr-2 rtl:rotate-180 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              العودة لسجل الطلاب
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-2xl shadow-sm">
                {student.user.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{student.user.fullName}</h1>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{student.studentCode}</span>
                  <Badge variant={student.academicStatus === 'ACTIVE' ? 'success' : 'default'} className="px-3 py-1 text-xs">
                    {student.academicStatus === 'ACTIVE' ? 'نشط' : 
                     student.academicStatus === 'GRADUATED' ? 'خريج' :
                     student.academicStatus === 'DROPPED_OUT' ? 'منسحب' :
                     student.academicStatus === 'SUSPENDED' ? 'موقوف' : student.academicStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto sm:mt-12 bg-slate-50/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <a 
              href={`tel:${student.user.phone?.replace(/[^0-9+]/g, '')}`} 
              className="inline-flex items-center justify-center p-3 rounded-xl hover:bg-blue-100 transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="اتصال هاتفي"
            >
              <Phone className="w-5 h-5" />
            </a>
            <div className="w-[1px] h-6 bg-slate-200"></div>
            <a 
              href={`https://wa.me/${student.user.phone?.replace(/[^0-9]/g, '')}`} 
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                معلومات الهوية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-slate-500">الصف الدراسي</dt>
                  <dd className="text-base font-semibold text-slate-900">{student.gradeLevel}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-slate-500">تاريخ التسجيل</dt>
                  <dd className="text-base font-semibold text-slate-900">{new Date(student.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-slate-500">رقم الهاتف</dt>
                  <dd className="text-base font-semibold text-slate-900" dir="ltr">{student.user.phone || 'غير متوفر'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-slate-500">هاتف الطوارئ</dt>
                  <dd className="text-base font-semibold text-slate-900" dir="ltr">{student.emergencyPhone || 'غير متوفر'}</dd>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">البريد الإلكتروني</dt>
                  <dd className="text-base font-semibold text-slate-900">{student.user.email || 'غير متوفر'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                المجموعات المسجلة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {student.groupEnrollments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>غير مسجل في أي مجموعات نشطة.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {student.groupEnrollments.map((enrollment) => (
                    <li key={enrollment.group.id} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{enrollment.group.name}</p>
                          <p className="text-sm text-slate-500">{enrollment.group.gradeLevel}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">نشط</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                حسابات أولياء الأمور
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {student.parentLinks.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>لا توجد حسابات مرتبطة بأولياء الأمور.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {student.parentLinks.map((link) => (
                    <li key={link.parent.user.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{link.parent.user.fullName}</p>
                          <p className="text-sm text-slate-500 font-mono" dir="ltr">{link.parent.user.phone}</p>
                        </div>
                        {link.parent.user.phone && (
                          <div className="flex items-center gap-1">
                            <a 
                              href={`tel:${link.parent.user.phone.replace(/[^0-9+]/g, '')}`} 
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              title="اتصال هاتفي"
                            >
                              <Phone className="w-5 h-5" />
                            </a>
                            <a 
                              href={`https://wa.me/${link.parent.user.phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-green-50 transition-colors text-green-500 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                              title="مراسلة عبر واتساب"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <StudentQrBadge studentId={studentId} />
        </div>
      </div>
    </div>
  );
}
