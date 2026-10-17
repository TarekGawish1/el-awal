'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { CreateAssessmentFormData } from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { generatePresignedUrl, uploadFileToR2, uploadRawFile, deleteFileFromStorage } from '@/features/content/api/content.api';
import { MultipleChoiceOptionsEditor } from './editor/MultipleChoiceOptionsEditor';
import toast from 'react-hot-toast';

interface AssessmentQuestionEditorProps {
  index: number;
  onRemove: () => void;
}

export function AssessmentQuestionEditor({ index, onRemove }: AssessmentQuestionEditorProps) {
  const { register, watch, formState: { errors }, setValue } = useFormContext<CreateAssessmentFormData>();
  const questionType = watch(`questions.${index}.questionType`);
  const optionsData = watch(`questions.${index}.optionsData`) || [];
  const optionImages = (watch(`questions.${index}.optionImages`) || []) as string[];

  const questionErrors = errors.questions?.[index];

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState<number | null>(null);

  // ── Question-level image helpers ─────────────────────────────────────────
  const addOption = () => {
    setValue(`questions.${index}.optionsData`, [...optionsData, '']);
    setValue(`questions.${index}.optionImages`, [...optionImages, '']);
  };

  const removeOption = (optIndex: number) => {
    const oldImg = optionImages[optIndex];
    if (oldImg) {
      deleteFileFromStorage(oldImg).catch(() => {});
    }

    const newOptions = [...optionsData];
    newOptions.splice(optIndex, 1);
    setValue(`questions.${index}.optionsData`, newOptions);

    const newImages = [...optionImages];
    newImages.splice(optIndex, 1);
    setValue(`questions.${index}.optionImages`, newImages);

    const correctAnswer = watch(`questions.${index}.correctAnswer`);
    if (correctAnswer === optionsData[optIndex]) {
      setValue(`questions.${index}.correctAnswer`, '');
    }
  };

  const setCorrectAnswer = (value: string) => {
    setValue(`questions.${index}.correctAnswer`, value, { shouldValidate: true });
  };

  // ── Generic upload helper ─────────────────────────────────────────────────
  const uploadImage = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (v: boolean) => void,
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }
    setLoading(true);
    try {
      const presigned = await generatePresignedUrl({
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        fileSizeBytes: file.size,
        folder: 'assessments',
      });
      await uploadFileToR2(presigned.uploadUrl, file, file.type || 'image/jpeg');
      onSuccess(presigned.publicUrl);
      toast.success('تم رفع الصورة بنجاح');
    } catch (directErr: any) {
      console.warn('Direct R2 presigned upload failed; falling back to server raw upload:', directErr);
      try {
        const rawRes = await uploadRawFile(file, 'assessments');
        onSuccess(rawRes.fileUrl);
        toast.success('تم رفع الصورة بنجاح');
      } catch (fbError: any) {
        toast.error(fbError?.message || directErr?.message || 'حدث خطأ أثناء رفع الصورة');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Question image upload ─────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(
      file,
      (url) => setValue(`questions.${index}.imageUrl`, url, { shouldValidate: true }),
      setIsUploading,
    );
    e.target.value = '';
  };

  // ── Option image upload ───────────────────────────────────────────────────
  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOptionIndex(optIndex);
    await uploadImage(
      file,
      (url) => {
        const newImages = [...optionImages];
        while (newImages.length <= optIndex) newImages.push('');
        newImages[optIndex] = url;
        setValue(`questions.${index}.optionImages`, newImages);
      },
      () => {}, // loading managed by uploadingOptionIndex
    );
    setUploadingOptionIndex(null);
    e.target.value = '';
  };

  const removeOptionImage = (optIndex: number) => {
    const oldImg = optionImages[optIndex];
    if (oldImg) {
      deleteFileFromStorage(oldImg).catch(() => {});
    }
    const newImages = [...optionImages];
    newImages[optIndex] = '';
    setValue(`questions.${index}.optionImages`, newImages);
  };

  const handleRemoveQuestion = () => {
    const qImg = watch(`questions.${index}.imageUrl`);
    if (qImg) {
      deleteFileFromStorage(qImg).catch(() => {});
    }
    for (const optImg of optionImages) {
      if (optImg) {
        deleteFileFromStorage(optImg).catch(() => {});
      }
    }
    onRemove();
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
        <Button
          variant="ghost"
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleRemoveQuestion}
          size="sm"
        >
          <Trash2 className="w-4 h-4 ml-1" />
          حذف السؤال
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-2">
            <Label>نص السؤال</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id={`image-upload-${index}`}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <Label
                htmlFor={`image-upload-${index}`}
                className={`text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploading ? 'جاري الرفع...' : 'إضافة صورة للسؤال'}
              </Label>
            </div>
          </div>
          <Textarea
            {...register(`questions.${index}.questionText`)}
            placeholder="اكتب نص السؤال هنا..."
            className={questionErrors?.questionText ? 'border-red-500' : ''}
            rows={2}
          />
          {questionErrors?.questionText && (
            <p className="text-red-500 text-xs mt-1">{questionErrors.questionText.message}</p>
          )}

          {watch(`questions.${index}.imageUrl`) && (
            <div className="mt-3 relative w-32 h-32 rounded-lg border border-slate-200 overflow-hidden group">
              <img
                src={watch(`questions.${index}.imageUrl`)}
                alt="Question image"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  const oldImg = watch(`questions.${index}.imageUrl`);
                  if (oldImg) {
                    deleteFileFromStorage(oldImg).catch(() => {});
                  }
                  setValue(`questions.${index}.imageUrl`, '');
                }}
                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
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
              if (val === QuestionType.TRUE_FALSE) {
                setValue(`questions.${index}.optionsData`, []);
                setValue(`questions.${index}.optionImages`, []);
                setValue(`questions.${index}.correctAnswer`, 'true');
              } else if (val === QuestionType.ESSAY) {
                setValue(`questions.${index}.optionsData`, []);
                setValue(`questions.${index}.optionImages`, []);
                setValue(`questions.${index}.correctAnswer`, 'Teacher will grade this manually');
              } else if (val === QuestionType.MULTIPLE_CHOICE) {
                setValue(`questions.${index}.optionsData`, ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع']);
                setValue(`questions.${index}.optionImages`, ['', '', '', '']);
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
        <MultipleChoiceOptionsEditor
          index={index}
          optionsData={optionsData}
          optionImages={optionImages}
          correctAnswer={watch(`questions.${index}.correctAnswer`) || ''}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onSetCorrectAnswer={setCorrectAnswer}
          onOptionChange={(optIndex, value) => {
            const newOptions = [...optionsData];
            const oldVal = newOptions[optIndex];
            newOptions[optIndex] = value;
            setValue(`questions.${index}.optionsData`, newOptions);
            if (watch(`questions.${index}.correctAnswer`) === oldVal) {
              setCorrectAnswer(value);
            }
          }}
          onOptionImageUpload={handleOptionImageUpload}
          onRemoveOptionImage={removeOptionImage}
          uploadingOptionIndex={uploadingOptionIndex}
          errorMessage={
            questionErrors?.optionsData && !Array.isArray(questionErrors.optionsData)
              ? ((questionErrors.optionsData as any)?.message as string)
              : undefined
          }
          correctAnswerError={questionErrors?.correctAnswer?.message}
        />
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
