'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import {
  FileText,
  Calendar,
  Clock,
  HelpCircle,
  Play,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

export interface AssessmentsOverviewListProps {
  fixedType?: 'EXAM' | 'ASSIGNMENT' | 'ALL';
  filterType: 'ALL' | 'EXAM' | 'ASSIGNMENT';
  onFilterChange: (type: 'ALL' | 'EXAM' | 'ASSIGNMENT') => void;
  filteredAssessments: any[];
  paginatedAssessments: any[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  getExamTimingStatus: (item: any) => any;
  getStatus: (item: any) => any;
  onSelectAssessment: (id: string) => void;
}

export function AssessmentsOverviewList({
  fixedType = 'EXAM',
  filterType,
  onFilterChange,
  filteredAssessments,
  paginatedAssessments,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  getExamTimingStatus,
  getStatus,
  onSelectAssessment,
}: AssessmentsOverviewListProps) {
  const isHomeworkPage = fixedType === 'ASSIGNMENT';
  const isExamPage = fixedType === 'EXAM';

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {isHomeworkPage
            ? 'الواجبات المنزلية'
            : isExamPage
            ? 'الاختبارات والتقييمات'
            : 'الواجبات والاختبارات'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isHomeworkPage
            ? 'حل ومتابعة واجبات الحصص المدرسية المسندة إليك ومراجعة الحلول'
            : isExamPage
            ? 'حل الاختبارات الدورية الشاملة ومتابعة الدرجات والنتائج'
            : 'حل الواجبات المدرسية والاختبارات المخصصة لك ومتابعة الدرجات والنتائج'}
        </p>
      </div>

      {/* Filters (only when not fixed to a specific single type) */}
      {fixedType === 'ALL' && (
        <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm">
          <button
            onClick={() => onFilterChange('ALL')}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => onFilterChange('EXAM')}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filterType === 'EXAM'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            الاختبارات
          </button>
          <button
            onClick={() => onFilterChange('ASSIGNMENT')}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filterType === 'ASSIGNMENT'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            الواجبات
          </button>
        </div>
      )}

      {/* Grid list */}
      {filteredAssessments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200/60">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {isHomeworkPage
              ? 'لا توجد واجبات منزلية مسندة إليك حالياً.'
              : isExamPage
              ? 'لا توجد اختبارات مضافة حالياً.'
              : 'لا توجد واجبات أو اختبارات مضافة حالياً.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedAssessments.map((item: any) => {
              const { isPastDue } = getStatus(item);
              const isExam = item.type === 'EXAM';
              const timing = getExamTimingStatus(item);

              return (
                <Card
                  key={item.id}
                  className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-500 to-primary-600"></div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={isExam ? 'error' : 'default'}
                            className={
                              isExam
                                ? 'bg-error-50 text-error-800'
                                : 'bg-primary-50 text-primary-700'
                            }
                          >
                            {isExam ? 'اختبار' : 'واجب'}
                          </Badge>
                          {isExam && item.timingType && (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-slate-50 text-slate-700"
                            >
                              {item.timingType === 'FIXED_SESSION'
                                ? '⏱️ جلسة موحدة'
                                : '🗓️ نافذة مرنة'}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="font-semibold">
                          {item.totalScore} درجة
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 leading-snug line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description || 'لا يوجد وصف متاح.'}
                      </p>

                      {/* Timing countdown badge for upcoming exams */}
                      {isExam && timing.isUpcoming && (
                        <div className="bg-indigo-50/80 border border-indigo-100 p-2.5 rounded-xl flex items-center gap-2 text-xs text-indigo-900 font-medium">
                          <Clock className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                          <span className="font-bold">يبدأ الاختبار بعد: </span>
                          <span className="font-mono font-extrabold text-indigo-700">
                            {timing.countdownFormatted}
                          </span>
                        </div>
                      )}

                      {isExam && timing.isEnded && (
                        <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-bold">انتهى موعد الاختبار</span>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            المدة: {item.durationMinutes ? `${item.durationMinutes} دقيقة` : 'غير محدد'}
                          </span>
                        </div>
                        {isExam && timing.startTime && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              موعد البدء: {formatArabicDate(timing.startTime)} -{' '}
                              {formatArabicTime(timing.startTime)}
                            </span>
                          </div>
                        )}
                        {(timing.endTime || item.dueDate) && (
                          <div
                            className={`flex items-center gap-1.5 ${
                              timing.isEnded || isPastDue ? 'text-rose-600' : ''
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {isExam ? 'موعد الإغلاق:' : 'تاريخ التسليم:'}{' '}
                              {formatArabicDate(timing.endTime || item.dueDate)} -{' '}
                              {formatArabicTime(timing.endTime || item.dueDate)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-primary-600 font-semibold mt-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>
                            المجموعة: {item.group?.name || item.course?.title || 'عام'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400 font-medium">
                        {item._count?.questions || 0} أسئلة
                      </span>

                      {isExam && timing.isUpcoming ? (
                        <Button
                          disabled
                          size="sm"
                          className="rounded-xl px-4 text-xs font-semibold opacity-60 cursor-not-allowed bg-slate-100 text-slate-500 border border-slate-200"
                        >
                          <Lock className="w-3.5 h-3.5 ml-1.5" />
                          لم يحن الموعد بعد
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onSelectAssessment(item.id)}
                          size="sm"
                          className={`rounded-xl px-4 text-xs font-semibold cursor-pointer ${
                            isExam && timing.isActive
                              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                              : ''
                          }`}
                        >
                          <Play className="w-3 h-3 ml-1.5" />
                          {isExam
                            ? timing.isEnded
                              ? 'عرض التفاصيل والنتيجة'
                              : 'ابدأ الاختبار'
                            : 'عرض وتفاصيل'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAssessments.length}
              pageSize={pageSize}
              onPageChange={onPageChange}
              itemLabel="اختبار/واجب"
            />
          )}
        </div>
      )}
    </>
  );
}
