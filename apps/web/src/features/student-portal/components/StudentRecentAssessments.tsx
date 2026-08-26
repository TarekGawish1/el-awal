'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useStudentAssessments } from '@/features/student-portal/hooks/useStudentPortal';
import { filterUpcomingGroupExams } from '../utils/assessments';

/**
 * Renders only upcoming physical (onsite) group exams for the student. Any
 * online course / lesson quiz (courseId / lessonId set) and any homework
 * (ASSIGNMENT type) are strictly excluded, and exams whose deadline has passed
 * are hidden. Mirrors the backend `getAssessments` scope for the STUDENT role.
 */
export function StudentRecentAssessments() {
  const { data: assessments, isLoading } = useStudentAssessments();
  const assessmentList = Array.isArray(assessments) ? assessments : (assessments?.data || []);

  const groupAssessments = filterUpcomingGroupExams(assessmentList);

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          أحدث الاختبارات
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : groupAssessments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 flex flex-col items-center">
            <FileText className="w-10 h-10 text-slate-300 mb-3" />
            <p>لا توجد اختبارات حاضورية متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupAssessments.slice(0, 3).map((assessment: any) => (
              <Link key={assessment.id} href={`/student/assessments?id=${assessment.id}`} className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 mb-1.5">
                      <Users className="w-3 h-3" />
                      {assessment.group?.name || assessment.targetGroups?.[0]?.name || 'مجموعة السنتر'}
                    </span>
                    <h4 className="font-bold text-slate-800 truncate">{assessment.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      الدرجة: {assessment.totalScore}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {assessment._count?.submissions > 0 ? (
                      <Badge variant="success">تم التسليم</Badge>
                    ) : (
                      <Badge variant="warning">مطلوب تسليمه</Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StudentRecentAssessments;
