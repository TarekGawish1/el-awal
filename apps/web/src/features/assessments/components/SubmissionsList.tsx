'use client';

import Link from 'next/link';
import { 
  Users, CheckCircle2, Search, ArrowLeft, ArrowRight, Clock, AlertCircle
} from 'lucide-react';
import { useAssessment, useAssessmentSubmissions } from '../hooks/use-assessments';
import { SubmissionStatus } from '../types/assessments.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

export function SubmissionsList({ assessmentId }: { assessmentId: string }) {
  const { data: assessment, isLoading: isAssessmentLoading } = useAssessment(assessmentId);
  const { data: submissions, isLoading, isError, error } = useAssessmentSubmissions(assessmentId);

  if (isLoading || isAssessmentLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !submissions) {
    return (
      <Alert variant="error">
        <AlertCircle className="w-5 h-5 ml-2" />
        <p>{(error as any)?.message || 'فشل في تحميل الإجابات'}</p>
      </Alert>
    );
  }

  const gradedCount = submissions.filter(s => s.status === SubmissionStatus.GRADED).length;
  const pendingCount = submissions.filter(s => s.status !== SubmissionStatus.GRADED).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 mb-1">
                إجابات الطلاب: {assessment?.title}
              </h1>
              <p className="text-slate-500 text-sm">مراجعة وتصحيح إجابات الطلاب</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{submissions.length}</span>
              <span className="text-sm text-slate-500 mt-1">إجمالي التسليمات</span>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-700">{gradedCount}</span>
              <span className="text-sm text-green-600 mt-1">مصحح</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
              <span className="text-sm text-amber-600 mt-1">بانتظار التصحيح</span>
            </div>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد إجابات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            لم يقم أي طالب بتسليم هذا الاختبار حتى الآن.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الطالب</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">وقت التسليم</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الحالة</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">النتيجة</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {submission.student?.user?.fullName?.charAt(0) || 'ط'}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {submission.student?.user?.fullName || 'طالب غير معروف'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="w-4 h-4 ml-1.5 text-slate-400" />
                        <span dir="ltr">
                          {submission.submittedAt 
                            ? new Date(submission.submittedAt).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'غير محدد'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {submission.status === SubmissionStatus.GRADED ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                          مصحح {submission.isAutoGraded ? '(تلقائي)' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200">
                          بانتظار المراجعة
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {submission.status === SubmissionStatus.GRADED ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${submission.isPassed ? 'text-green-600' : 'text-red-500'}`}>
                            {submission.scoreObtained}
                          </span>
                          <span className="text-slate-400 text-sm">/ {assessment?.totalScore}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/teacher/assessments/${assessmentId}/submissions/${submission.id}`}>
                        <Button variant="outline" size="sm" className="w-full h-8">
                          {submission.status === SubmissionStatus.GRADED ? 'عرض الإجابة' : 'تصحيح الآن'}
                          <ArrowLeft className="w-3 h-3 mr-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
