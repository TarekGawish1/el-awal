'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { CreateAssessmentFormData } from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface AssessmentQuestionEditorProps {
  index: number;
  onRemove: () => void;
}

export function AssessmentQuestionEditor({ index, onRemove }: AssessmentQuestionEditorProps) {
  const { register, watch, formState: { errors }, setValue, control } = useFormContext<CreateAssessmentFormData>();
  const questionType = watch(`questions.${index}.questionType`);
  const optionsData = watch(`questions.${index}.optionsData`) || [];
  
  const questionErrors = errors.questions?.[index];

  const addOption = () => {
    setValue(`questions.${index}.optionsData`, [...optionsData, '']);
  };

  const removeOption = (optIndex: number) => {
    const newOptions = [...optionsData];
    newOptions.splice(optIndex, 1);
    setValue(`questions.${index}.optionsData`, newOptions);
    
    // If the removed option was the correct answer, reset it
    const correctAnswer = watch(`questions.${index}.correctAnswer`);
    if (correctAnswer === optionsData[optIndex]) {
      setValue(`questions.${index}.correctAnswer`, '');
    }
  };

  const setCorrectAnswer = (value: string) => {
    setValue(`questions.${index}.correctAnswer`, value, { shouldValidate: true });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="cursor-move text-slate-300 hover:text-slate-500">
            <GripVertical className="w-5 h-5" />
          </div>
          <span className="bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">
            {index + 1}
          </span>
        </div>
        <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onRemove} size="sm">
          <Trash2 className="w-4 h-4 ml-1" />
          حذف السؤال
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <Label className="mb-2 block">نص السؤال</Label>
          <Textarea 
            {...register(`questions.${index}.questionText`)}
            placeholder="اكتب نص السؤال هنا..."
            className={questionErrors?.questionText ? 'border-red-500' : ''}
            rows={2}
          />
          {questionErrors?.questionText && (
            <p className="text-red-500 text-xs mt-1">{questionErrors.questionText.message}</p>
          )}
        </div>
        
        <div>
          <Label className="mb-2 block">الدرجة</Label>
          <Input 
            type="number"
            step="0.5"
            {...register(`questions.${index}.points`)}
            className={questionErrors?.points ? 'border-red-500' : ''}
          />
          {questionErrors?.points && (
            <p className="text-red-500 text-xs mt-1">{questionErrors.points.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">نوع السؤال</Label>
          <Select 
            options={[
              { label: 'اختيار من متعدد', value: QuestionType.MULTIPLE_CHOICE },
              { label: 'صح أم خطأ', value: QuestionType.TRUE_FALSE },
              { label: 'مقال / نصي', value: QuestionType.ESSAY }
            ]}
            {...register(`questions.${index}.questionType`)}
            onChange={(e) => {
              const val = e.target.value as QuestionType;
              setValue(`questions.${index}.questionType`, val);
              // Reset specific fields when type changes
              if (val === QuestionType.TRUE_FALSE) {
                setValue(`questions.${index}.optionsData`, []);
                setValue(`questions.${index}.correctAnswer`, 'true');
              } else if (val === QuestionType.ESSAY) {
                setValue(`questions.${index}.optionsData`, []);
                setValue(`questions.${index}.correctAnswer`, 'Teacher will grade this manually');
              } else if (val === QuestionType.MULTIPLE_CHOICE) {
                setValue(`questions.${index}.optionsData`, ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع']);
                setValue(`questions.${index}.correctAnswer`, '');
              }
            }}
          />
        </div>

        <div>
          <Label className="mb-2 block">شرح الإجابة (اختياري)</Label>
          <Input 
            {...register(`questions.${index}.explanation`)}
            placeholder="شرح يظهر للطالب بعد التقييم"
          />
        </div>
      </div>

      {/* Multiple Choice Options */}
      {questionType === QuestionType.MULTIPLE_CHOICE && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <Label className="font-semibold text-slate-700">الخيارات</Label>
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="w-3 h-3 ml-1" />
              إضافة خيار
            </Button>
          </div>
          
          {questionErrors?.optionsData && !Array.isArray(questionErrors.optionsData) && (
             <p className="text-red-500 text-xs mb-2">{(questionErrors.optionsData as any)?.message}</p>
          )}

          <div className="space-y-3">
            {optionsData.map((opt, optIndex) => (
              <div key={optIndex} className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name={`correctAnswer-${index}`}
                  checked={watch(`questions.${index}.correctAnswer`) === opt}
                  onChange={() => setCorrectAnswer(opt)}
                  className="w-4 h-4 text-primary bg-slate-100 border-slate-300 focus:ring-primary focus:ring-2"
                />
                <div className="flex-1">
                  <Input 
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...optionsData];
                      const oldVal = newOptions[optIndex];
                      newOptions[optIndex] = e.target.value;
                      setValue(`questions.${index}.optionsData`, newOptions);
                      
                      if (watch(`questions.${index}.correctAnswer`) === oldVal) {
                        setCorrectAnswer(e.target.value);
                      }
                    }}
                    placeholder={`الخيار ${optIndex + 1}`}
                    className={
                      watch(`questions.${index}.correctAnswer`) === opt 
                        ? 'border-green-400 bg-green-50' 
                        : ''
                    }
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-slate-400 hover:text-red-500" 
                  onClick={() => removeOption(optIndex)}
                  disabled={optionsData.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {questionErrors?.correctAnswer && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{questionErrors.correctAnswer.message}</span>
            </div>
          )}
        </div>
      )}

      {/* True / False Options */}
      {questionType === QuestionType.TRUE_FALSE && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <Label className="font-semibold text-slate-700 mb-3 block">الإجابة الصحيحة</Label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${watch(`questions.${index}.correctAnswer`) === 'true' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                className="hidden"
                checked={watch(`questions.${index}.correctAnswer`) === 'true'}
                onChange={() => setCorrectAnswer('true')}
              />
              صحيحة
            </label>
            <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${watch(`questions.${index}.correctAnswer`) === 'false' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <input 
                type="radio" 
                className="hidden"
                checked={watch(`questions.${index}.correctAnswer`) === 'false'}
                onChange={() => setCorrectAnswer('false')}
              />
              خاطئة
            </label>
          </div>
          {questionErrors?.correctAnswer && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{questionErrors.correctAnswer.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Essay Info */}
      {questionType === QuestionType.ESSAY && (
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">سؤال مقالي (نصي)</p>
            <p>يتطلب هذا النوع من الأسئلة تصحيحاً يدوياً من قبل المعلم بعد التسليم. الدرجة المحددة هنا هي الحد الأقصى الذي يمكن منحه للطالب.</p>
          </div>
        </div>
      )}
    </div>
  );
}
