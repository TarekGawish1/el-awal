import Link from 'next/link';
import { FileText, Clock, Calendar, Users, Eye, Edit, ChevronLeft } from 'lucide-react';
import { AssessmentListItem } from '../types/assessments.types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface AssessmentCardProps {
  assessment: AssessmentListItem;
}

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  const isPublished = assessment.isPublished;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
      <div className="p-5 border-b border-slate-100">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 mb-2">
            <Badge variant={isPublished ? 'success' : 'warning'}>
              {isPublished ? 'منشور' : 'مسودة'}
            </Badge>
            <Badge variant="info">
              {assessment.type === 'ASSIGNMENT' ? 'واجب' : 'اختبار'}
            </Badge>
            {assessment.type === 'EXAM' && assessment.timingType && (
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                {assessment.timingType === 'FIXED_SESSION' ? '⏱️ جلسة متزامنة' : '🗓️ نافذة مرنة'}
              </Badge>
            )}
          </div>
          <div className="text-slate-500 text-sm font-medium bg-slate-50 px-2 py-1 rounded-md">
            {assessment.totalScore} درجة
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1" title={assessment.title}>
          {assessment.title}
        </h3>
        
        <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>{assessment._count?.questions || 0} أسئلة</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{assessment._count?.submissions || 0} تسليمات</span>
          </div>
          {assessment.durationMinutes && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{assessment.durationMinutes} دقيقة</span>
            </div>
          )}
          {(assessment.endTime || assessment.dueDate) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span dir="ltr">
                {new Date(assessment.endTime || assessment.dueDate!).toLocaleDateString('ar-EG', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-50 mt-auto flex items-center justify-between gap-3">
        <Link href={`/teacher/assessments/${assessment.id}`} className="flex-1">
          <Button variant="outline" className="w-full text-sm h-9 bg-white">
            <Eye className="w-4 h-4 ml-2" />
            التفاصيل
          </Button>
        </Link>
        <Link href={`/teacher/assessments/${assessment.id}/submissions`} className="flex-1">
          <Button variant="primary" className="w-full text-sm h-9">
            الإجابات
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
