'use client';

import React from 'react';
import { Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

interface ChildAssignmentsSectionProps {
  assignments: any[];
  pendingAssignmentsCount: number;
  primaryGroup: any;
}

export function ChildAssignmentsSection({
  assignments,
  pendingAssignmentsCount,
  primaryGroup,
}: ChildAssignmentsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary-600" />
          الواجبات المنزلية والمهام المطلوبة
        </h4>
        {pendingAssignmentsCount > 0 ? (
          <Badge variant="warning" className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border-amber-200">
            {pendingAssignmentsCount} واجب مطلوب تسليمه
          </Badge>
        ) : assignments.length > 0 ? (
          <Badge variant="success" className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
            تم تسليم الكل بنجاح ✅
          </Badge>
        ) : null}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-800">لا توجد واجبات منزلية مطلوبة حالياً</p>
          <p className="text-xs text-slate-500 mt-1">كافة الواجبات تم إنجازها أو لم يتم تعيين واجب جديد بعد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((item: any) => {
            const submission = item.submissions?.[0];
            const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED';
            const isGraded = submission?.status === 'GRADED';
            const isOverdue = item.dueDate ? !isSubmitted && new Date(item.dueDate).getTime() < Date.now() : false;
            const targetGroupName = item.group?.name || item.targetGroups?.[0]?.name || primaryGroup?.name || 'المجموعة الدراسية';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSubmitted
                    ? 'bg-emerald-50/20 border-emerald-100/70'
                    : isOverdue
                    ? 'bg-rose-50/30 border-rose-100/70'
                    : 'bg-white border-slate-100 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {targetGroupName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                      {item.dueDate ? (
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          موعد التسليم: {formatArabicDate(item.dueDate)} — {formatArabicTime(item.dueDate)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          موعد التسليم: قبل موعد الحصة القادمة
                        </span>
                      )}

                      <span className="text-slate-300">•</span>
                      <span>{item._count?.questions || 0} أسئلة</span>
                      <span className="text-slate-300">•</span>
                      <span>{item.totalScore} درجة</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isSubmitted ? (
                      <div className="text-end">
                        <Badge variant="success" className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 border-emerald-200">
                          تم تسليم الواجب
                        </Badge>
                        {isGraded && submission.scoreObtained !== null && (
                          <p className="text-[11px] font-black text-emerald-700 mt-1">
                            الدرجة: {submission.scoreObtained} / {item.totalScore}
                          </p>
                        )}
                      </div>
                    ) : isOverdue ? (
                      <Badge variant="error" className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 border-rose-200">
                        فات موعد التسليم
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 border-amber-200">
                        مطلوب حله وتسليمه
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Parent Notice */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    📌 يتم حل أسئلة الواجب من خلال حساب الطالب على المنصة.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
