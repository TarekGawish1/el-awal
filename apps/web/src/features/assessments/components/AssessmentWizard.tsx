'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Plus, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { createAssessmentSchema, CreateAssessmentFormData } from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';
import { AssessmentQuestionEditor } from './AssessmentQuestionEditor';
import { useCreateAssessment } from '../hooks/use-assessments';
import { useGroups } from '../../groups/hooks/useGroups';
import toast from 'react-hot-toast';

type Step = 'metadata' | 'questions' | 'review';

export function AssessmentWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('metadata');
  
  const { mutate: createAssessment, isPending } = useCreateAssessment();

  const methods = useForm<CreateAssessmentFormData>({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: {
      title: '',
      description: '',
      totalScore: 100,
      passingScore: 50,
      durationMinutes: 60,
      isAutoGraded: true,
      questions: [
        {
          questionNumber: 1,
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          questionText: '',
          optionsData: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
          correctAnswer: '',
          displayOrder: 0,
        }
      ],
      academicStage: '',
      gradeLevel: '',
      targetGroupIds: [],
    },
    mode: 'onTouched'
  });

  const { control, handleSubmit, formState: { errors }, trigger, getValues } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  const formDataValues = methods.watch();
  const selectedStage = formDataValues.academicStage;
  const selectedGrade = formDataValues.gradeLevel;
  
  const { data: allGroups } = useGroups();
  const availableGroups = allGroups?.filter(g => g.gradeLevel === selectedGrade) || [];

  const gradeOptions: Record<string, { label: string; value: string }[]> = {
    PRIMARY: [
      { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
      { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
      { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
      { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
      { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
      { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
    ],
    MIDDLE: [
      { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
      { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
      { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
    ],
    SECONDARY: [
      { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
      { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
      { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
    ],
  };

  const nextStep = async (step: Step) => {
    let isValid = false;
    
    if (currentStep === 'metadata') {
      isValid = await trigger(['title', 'description', 'totalScore', 'passingScore', 'startDate', 'durationMinutes']);
    } else if (currentStep === 'questions') {
      isValid = await trigger('questions');
      if (isValid && fields.length === 0) {
        toast.error('يجب إضافة سؤال واحد على الأقل');
        isValid = false;
      }
    }

    if (isValid) {
      setCurrentStep(step);
    } else {
      toast.error('يرجى تصحيح الأخطاء قبل المتابعة');
    }
  };

  const onSubmit = (data: CreateAssessmentFormData, isPublished: boolean) => {
    const payloadQuestions = data.questions.map((q, idx) => {
      const { displayOrder, ...rest } = q;
      return { ...rest, questionNumber: idx + 1 };
    });
    
    // Scrub empty fields
    const payload: any = {
      ...data,
      type: 'EXAM',
      isPublished,
      questions: payloadQuestions,
    };
    
    if (!payload.startDate) delete payload.startDate;
    if (!payload.dueDate) delete payload.dueDate;
    if (!payload.academicStage) delete payload.academicStage;
    if (!payload.gradeLevel) delete payload.gradeLevel;
    if (!payload.durationMinutes) delete payload.durationMinutes;
    if (!payload.targetGroupIds || payload.targetGroupIds.length === 0) delete payload.targetGroupIds;
    
    // Remove extra properties that the backend ValidationPipe forbids
    delete payload.isAutoGraded;

    createAssessment(
      payload,
      {
        onSuccess: (res: any) => {
          toast.success(isPublished ? 'تم إنشاء ونشر الاختبار بنجاح' : 'تم حفظ الاختبار كمسودة');
          const id = res?.id || res?.data?.id;
          if (id) {
            router.push(`/teacher/assessments/${id}`);
          } else {
            router.push('/teacher/assessments');
          }
        },
        onError: (err: any) => {
          toast.error(err?.message || 'حدث خطأ أثناء إنشاء الاختبار');
        }
      }
    );
  };

  const formData = getValues();
  const questionsSum = formData.questions?.reduce((sum, q) => sum + (Number(q.points) || 0), 0) || 0;

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto pb-64">
        
        {/* Progress Stepper */}
        <div className="mb-12 relative">
          {/* Background line aligned to circle centers */}
          <div className="absolute top-5 left-[20px] right-[20px] h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full">
            {/* Active progress line */}
            <div 
              className="absolute top-0 right-0 h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
              style={{ 
                width: currentStep === 'metadata' ? '0%' : 
                       currentStep === 'questions' ? '50%' : '100%' 
              }}
            />
          </div>
          
          <div className="relative z-10 flex justify-between">
            {['metadata', 'questions', 'review'].map((step, index) => {
              const isCompleted = 
                (currentStep === 'questions' && index === 0) || 
                (currentStep === 'review' && index <= 1);
              const isCurrent = currentStep === step;
              
              const stepTitles = ['المعلومات الأساسية', 'الأسئلة', 'المراجعة والنشر'];
              
              return (
                <div key={step} className="flex flex-col items-center w-24">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-sm
                      ${isCompleted ? 'bg-primary-500 border-primary-500 text-white' : 
                        isCurrent ? 'bg-white border-primary-500 text-primary-600 ring-4 ring-primary-50' : 
                        'bg-white border-slate-200 text-slate-400'}`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`mt-3 text-sm font-bold text-center transition-colors ${isCurrent || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stepTitles[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
          
          {currentStep === 'metadata' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">المعلومات الأساسية</h2>
                <p className="text-slate-500 text-sm">أدخل تفاصيل الاختبار مثل العنوان، الوصف، والمدة المحددة.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">عنوان الاختبار <span className="text-red-500">*</span></Label>
                  <Input 
                    {...methods.register('title')} 
                    placeholder="مثال: امتحان منتصف الفصل الدراسي الأول"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="mb-2 block">المرحلة الدراسية (اختياري)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'PRIMARY', label: 'الابتدائية', icon: '✏️' },
                        { id: 'MIDDLE', label: 'الإعدادية', icon: '🏫' },
                        { id: 'SECONDARY', label: 'الثانوية', icon: '🎓' },
                      ].map((stage) => (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => {
                            methods.setValue('academicStage', stage.id);
                            methods.setValue('gradeLevel', '');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 ${
                            selectedStage === stage.id
                              ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                              : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="text-xl mb-1">{stage.icon}</span>
                          <span className="font-bold text-xs">{stage.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Select
                      label="الصف الدراسي (اختياري)"
                      name="gradeLevel"
                      disabled={!selectedStage}
                      value={formDataValues.gradeLevel || ''}
                      onChange={e => {
                        methods.setValue('gradeLevel', e.target.value);
                        methods.setValue('targetGroupIds', []); // Reset groups when grade changes
                      }}
                      options={[
                        { label: '-- اختر الصف الدراسي --', value: '' },
                        ...(selectedStage ? gradeOptions[selectedStage] : []),
                      ]}
                    />
                  </div>
                </div>

                {selectedGrade && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Label className="mb-3 block font-bold text-slate-800">
                      المجموعات المستهدفة <span className="text-sm font-normal text-slate-500">(اختر المجموعات التي ستمتحن)</span>
                    </Label>
                    
                    {availableGroups.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {availableGroups.map(group => (
                          <label key={group.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
                            <input
                              type="checkbox"
                              value={group.id}
                              checked={formDataValues.targetGroupIds?.includes(group.id)}
                              onChange={(e) => {
                                const currentIds = formDataValues.targetGroupIds || [];
                                if (e.target.checked) {
                                  methods.setValue('targetGroupIds', [...currentIds, group.id]);
                                } else {
                                  methods.setValue('targetGroupIds', currentIds.filter(id => id !== group.id));
                                }
                              }}
                              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-slate-700">{group.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-200 text-center">
                        لا توجد مجموعات مسجلة في هذا الصف الدراسي.
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">الدرجة الكلية <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number"
                      {...methods.register('totalScore')} 
                      className={errors.totalScore ? 'border-red-500' : ''}
                    />
                    {errors.totalScore && <p className="text-red-500 text-sm mt-1">{errors.totalScore.message}</p>}
                  </div>
                  <div>
                    <Label className="mb-2 block">درجة النجاح <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number"
                      {...methods.register('passingScore')} 
                      className={errors.passingScore ? 'border-red-500' : ''}
                    />
                    {errors.passingScore && <p className="text-red-500 text-sm mt-1">{errors.passingScore.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">موعد بدء الاختبار (اختياري)</Label>
                    <DateTimePicker
                      value={formDataValues.startDate}
                      onChange={(val) => {
                        methods.setValue('startDate', val, { shouldValidate: true, shouldDirty: true });
                      }}
                      placeholder="اختر موعد البدء..."
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">مدة الاختبار (بالدقائق)</Label>
                    <Input 
                      type="number"
                      {...methods.register('durationMinutes')} 
                      placeholder="اتركه فارغاً لاختبار بدون وقت محدد"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                <Button onClick={() => nextStep('questions')}>
                  التالي: الأسئلة
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'questions' && (
            <div className="p-6 sm:p-8 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">الأسئلة</h2>
                  <p className="text-slate-500 text-sm">أضف أسئلة الاختبار وحدد الإجابات الصحيحة والدرجات.</p>
                </div>
                <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
                  <div className="text-sm font-medium text-slate-500">إجمالي درجات الأسئلة:</div>
                  <div className={`text-lg font-bold ${questionsSum !== (formDataValues.totalScore || 0) ? 'text-amber-500' : 'text-primary'}`} title="الدرجة الكلية المحددة للاختبار">
                    {questionsSum} / {formDataValues.totalScore}
                  </div>
                </div>
              </div>

              {errors.passingScore && (
                <Alert variant="error" className="mb-6">
                  <AlertTriangle className="w-5 h-5 ml-2" />
                  <p>{errors.passingScore.message}</p>
                </Alert>
              )}

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <AssessmentQuestionEditor 
                    key={field.id} 
                    index={index} 
                    onRemove={() => remove(index)} 
                  />
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-dashed border-2 bg-white hover:bg-slate-50"
                  onClick={() => append({
                    questionNumber: fields.length + 1,
                    questionType: QuestionType.MULTIPLE_CHOICE,
                    questionText: '',
                    points: 5,
                    displayOrder: fields.length + 1,
                    optionsData: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
                    correctAnswer: '',
                  })}
                >
                  <Plus className="w-5 h-5 ml-2" />
                  إضافة سؤال جديد
                </Button>
              </div>

              <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep('metadata')}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  رجوع
                </Button>
                <Button onClick={() => nextStep('review')}>
                  التالي: المراجعة
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">المراجعة والنشر</h2>
                <p className="text-slate-500 text-sm">راجع تفاصيل الاختبار قبل حفظه أو نشره للطلاب.</p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {formData.title}
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">الدرجة الكلية</span>
                    <span className="font-bold text-slate-800 text-lg">{formData.totalScore}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">درجة النجاح</span>
                    <span className="font-bold text-slate-800 text-lg">{formData.passingScore}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">المدة المحددة</span>
                    <span className="font-bold text-slate-800 text-lg">{formData.durationMinutes ? `${formData.durationMinutes} دقيقة` : 'بدون وقت'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">عدد الأسئلة</span>
                    <span className="font-bold text-slate-800 text-lg">{fields.length}</span>
                  </div>
                </div>

                {formData.description && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <span className="text-slate-500 text-sm block mb-1">الوصف:</span>
                    <p className="text-slate-700">{formData.description}</p>
                  </div>
                )}
              </div>

              {/* Questions Preview */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">نظرة عامة على الأسئلة</h4>
                <div className="space-y-3">
                  {formData.questions?.map((q, i) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <span className="font-medium text-slate-700 block line-clamp-1">{i + 1}. {q.questionText}</span>
                        <span className="text-xs text-slate-500">
                          {q.questionType === QuestionType.MULTIPLE_CHOICE ? 'اختيار من متعدد' : 
                           q.questionType === QuestionType.TRUE_FALSE ? 'صح أم خطأ' : 'مقال'}
                        </span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold shrink-0">
                        {q.points} درجات
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <Button variant="ghost" onClick={() => setCurrentStep('questions')}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  رجوع للأسئلة
                </Button>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSubmit((data) => onSubmit(data, false))}
                    disabled={isPending}
                  >
                    حفظ كمسودة
                  </Button>
                  <Button 
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    نشر الاختبار
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
