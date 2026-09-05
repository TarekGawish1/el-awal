'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, Calendar, Clock, CheckCircle2, 
  Settings, Users, EyeOff, Eye, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { useAssessment, useUpdateAssessment } from '../hooks/use-assessments';
import { QuestionType } from '../types/assessments.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EditAssessmentMetadataModal } from './EditAssessmentMetadataModal';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

export function AssessmentDetails({ assessmentId }: { assessmentId: string }) {
  const isOnline = useOnlineStatus();
  const { data: assessment, isLoading, isError, error } = useAssessment(assessmentId);

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="تفاصيل الاختبار"
        description="عرض وتعديل تفاصيل الاختبارات والواجبات يتطلب اتصالاً نشطاً بالخادم."
        backHref="/teacher/dashboard"
      />
    );
  }
  const { mutate: updateAssessment, isPending: isUpdating } = useUpdateAssessment();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <Alert variant="error">
        <AlertTriangle className="w-5 h-5 ml-2" />
        <p>{(error as any)?.message || 'فشل في تحميل تفاصيل الاختبار'}</p>
      </Alert>
    );
  }

  const hasSubmissions = (assessment._count?.submissions || 0) > 0;

  const togglePublishStatus = () => {
    updateAssessment(
      { id: assessment.id, payload: { isPublished: !assessment.isPublished } },
      {
        onSuccess: () => {
          toast.success(assessment.isPublished ? 'تم إلغاء نشر الاختبار' : 'تم نشر الاختبار بنجاح');
        },
        onError: (err: any) => {
          if (err.statusCode === 409) {
            toast.error('لا يمكن إلغاء نشر الاختبار بعد وجود محاولات من الطلاب.');
          } else {
            toast.error(err.message || 'حدث خطأ أثناء تغيير حالة النشر');
          }
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header / Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={assessment.isPublished ? 'success' : 'warning'}>
                  {assessment.isPublished ? 'منشور للطلاب' : 'مسودة (غير مرئي للطلاب)'}
                </Badge>
                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                  {assessment.totalScore} درجة
                </Badge>
                {assessment.type === 'EXAM' && (
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                    {assessment.timingType === 'FLEXIBLE_WINDOW' ? '🗓️ نافذة زمنية مرنة' : '⏱️ موعد موحد متزامن'}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{assessment.title}</h1>
              {assessment.description && (
                <p className="text-slate-500 mt-2 max-w-2xl">{assessment.description}</p>
              )}
            </div>
            
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                <Settings className="w-4 h-4 ml-2" />
                تعديل المعلومات
              </Button>
              <Button 
                variant={assessment.isPublished ? 'outline' : 'primary'} 
                onClick={togglePublishStatus}
                disabled={isUpdating}
              >
                {assessment.isPublished ? (
                  <>
                    <EyeOff className="w-4 h-4 ml-2" />
                    إلغاء النشر
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 ml-2" />
                    نشر الاختبار
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">درجة النجاح</p>
                <p className="font-bold text-slate-800">{assessment.passingScore}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">المدة الفردية</p>
                <p className="font-bold text-slate-800">
                  {assessment.durationMinutes ? `${assessment.durationMinutes} دقيقة` : 'غير محدد'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{assessment.type === 'EXAM' ? 'فترة الاختبار' : 'تاريخ التسليم'}</p>
                <p className="font-bold text-slate-800 text-xs leading-relaxed">
                  {assessment.startTime || assessment.startDate
                    ? `${new Date(assessment.startTime || assessment.startDate!).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                  {(assessment.endTime || assessment.dueDate) && (
                    <span>
                      {assessment.startTime || assessment.startDate ? ' إلى ' : ''}
                      {new Date(assessment.endTime || assessment.dueDate!).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {!assessment.startTime && !assessment.startDate && !assessment.endTime && !assessment.dueDate && 'غير محدد'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">التسليمات</p>
                <p className="font-bold text-slate-800">{assessment._count?.submissions || 0}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            {hasSubmissions 
              ? 'يوجد محاولات من الطلاب لهذا الاختبار، بعض خيارات التعديل مغلقة.' 
              : 'لم يقم أي طالب بالحل بعد.'}
          </p>
          <Link href={`/teacher/assessments/${assessment.id}/submissions`}>
            <Button>
              مشاهدة إجابات الطلاب
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Questions List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          أسئلة الاختبار ({assessment.questions?.length || 0})
        </h2>

        <div className="space-y-4">
          {assessment.questions?.map((question, index) => (
            <div key={question.id || index} className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full bg-primary/40" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-start">
                  <div className="bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {question.questionNumber}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 leading-relaxed whitespace-pre-wrap mb-3">
                      {question.questionText}
                    </h3>
                    {question.imageUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 max-w-sm">
                        <img 
                          src={question.imageUrl} 
                          alt="Question content" 
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 mr-4">
                  <Badge variant="default" className="bg-slate-50 border-slate-200 text-slate-700">
                    {question.points} درجات
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">
                    {question.questionType === QuestionType.MULTIPLE_CHOICE ? 'اختيار من متعدد' : 
                     question.questionType === QuestionType.TRUE_FALSE ? 'صح أم خطأ' : 'مقال نصي'}
                  </span>
                </div>
              </div>

              {/* Options mapping if MCQ */}
              {question.questionType === QuestionType.MULTIPLE_CHOICE && question.optionsData && (
                <div className="mr-11 mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(question.optionsData as string[]).map((opt, i) => {
                    const isCorrect = question.correctAnswer === opt;
                    const optImg = (question.optionImages as string[] | undefined)?.[i];
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-sm flex flex-col gap-2 ${
                          isCorrect
                            ? 'border-green-200 bg-green-50 text-green-800 font-medium'
                            : 'border-slate-100 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isCorrect ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'
                          }`}>
                            {isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          {opt}
                        </div>
                        {optImg && (
                          <img
                            src={optImg}
                            alt={`صورة الخيار ${i + 1}`}
                            className="w-full max-h-32 object-cover rounded-md border border-slate-200"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* True/False UI */}
              {question.questionType === QuestionType.TRUE_FALSE && (
                <div className="mr-11 mt-4 flex gap-4">
                  <div className={`px-4 py-2 rounded border text-sm font-medium ${question.correctAnswer === 'true' ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-50'}`}>
                    إجابة صحيحة
                  </div>
                  <div className={`px-4 py-2 rounded border text-sm font-medium ${question.correctAnswer === 'false' ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-50'}`}>
                    إجابة خاطئة
                  </div>
                </div>
              )}
              
              {/* Explanation */}
              {question.explanation && (
                <div className="mr-11 mt-4 p-3 bg-blue-50/50 text-blue-800 text-sm rounded-lg border border-blue-100">
                  <span className="font-bold block mb-1">الشرح المرفق:</span>
                  {question.explanation}
                </div>
              )}
            </div>
          ))}

          {(!assessment.questions || assessment.questions.length === 0) && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500">لا توجد أسئلة في هذا الاختبار</p>
            </div>
          )}
        </div>
      </div>

      <EditAssessmentMetadataModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        assessment={assessment} 
      />
    </div>
  );
}
