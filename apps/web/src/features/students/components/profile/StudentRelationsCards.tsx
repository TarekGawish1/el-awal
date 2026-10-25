'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Phone, Clock, Calendar, Link as LinkIcon, UserCheck } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import {
  formatJoiningDate,
  formatJoiningTime,
  formatJoiningDateTime,
  resolveJoiningMethod,
} from '../../utils/studentJoiningHelpers';

interface StudentRelationsCardsProps {
  student: any;
  studentPhone: string;
  enrollments: any[];
  parents: any[];
}

export function StudentRelationsCards({
  student,
  studentPhone,
  enrollments,
  parents,
}: StudentRelationsCardsProps) {
  const method = resolveJoiningMethod(student);

  return (
    <>
      {/* Identity Information Card */}
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
              <dd className="text-base font-semibold text-slate-900">{student.gradeLevel || 'الصف الدراسي'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-slate-500">تاريخ ووقت الانضمام</dt>
              <dd className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>{formatJoiningDateTime(student.createdAt)}</span>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-slate-500">طريقة الانضمام للمنصة</dt>
              <dd className="pt-1">
                {method.isGroupLink ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>انضمام عبر رابط المجموعة ({method.groupName || 'المجموعة'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>{method.label}</span>
                  </span>
                )}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-slate-500">رقم الهاتف</dt>
              <dd className="text-base font-semibold text-slate-900 font-mono" dir="ltr">{studentPhone || 'غير متوفر'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Enrolled Groups Card */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            المجموعات المسجلة وتاريخ الالتحاق
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>غير مسجل في أي مجموعات نشطة.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrollments.map((enrollment: any, idx: number) => (
                <li key={enrollment.group?.id || `grp-${idx}`} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{enrollment.group?.name || 'المجموعة الدراسية'}</p>
                      <p className="text-sm text-slate-500">{enrollment.group?.gradeLevel || student.gradeLevel || ''}</p>
                      {enrollment.enrolledAt && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary-500" />
                          <span>التحق بالمجموعة: {formatJoiningDateTime(enrollment.enrolledAt)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">نشط</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Parents Card */}
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
          {parents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>لا توجد حسابات مرتبطة بأولياء الأمور.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {parents.map((link: any, idx: number) => {
                const parentFullName = link.parent?.user?.fullName || 'ولي الأمر';
                const parentPhone = link.parent?.user?.phone || student.emergencyPhone || '';

                return (
                  <li key={link.parent?.user?.id || `parent-${idx}`} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{parentFullName}</p>
                        <p className="text-sm text-slate-500 font-mono" dir="ltr">{parentPhone || 'بدون هاتف'}</p>
                      </div>
                      {parentPhone && (
                        <div className="flex items-center gap-1">
                          <a 
                            href={`tel:${parentPhone.replace(/[^0-9+]/g, '')}`} 
                            className="inline-flex items-center justify-center p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                          <a 
                            href={`https://wa.me/${formatWhatsAppNumber(parentPhone)}`} 
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
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
