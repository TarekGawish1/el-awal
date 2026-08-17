'use client';

import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { ContentType } from '../types/content.types';
import { useUploadContent } from '../hooks/use-content';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';

const uploadSchema = z.object({
  title: z.string().min(3, 'عنوان الملف مطلوب (3 أحرف على الأقل)'),
  description: z.string().optional(),
  contentType: z.nativeEnum(ContentType),
  groupId: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function UploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData } = useGroups();
  const groups = groupsData || [];

  const { mutate: uploadContent, isPending } = useUploadContent();

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      contentType: ContentType.FILE,
    }
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
    setFileError(null);
    reset();
    onClose();
  };

  const validateFile = (selectedFile: File): boolean => {
    setFileError(null);
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (100MB)');
      return false;
    }
    
    // Fallback checking file extension if mime type is empty
    if (!selectedFile.type && !selectedFile.name.match(/\.(pdf|jpg|jpeg|png|webp|mp3|wav|mp4|doc|docx)$/i)) {
       setFileError('نوع الملف غير مدعوم');
       return false;
    } else if (selectedFile.type && !ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError(`نوع الملف غير مدعوم. الأنواع المسموحة: PDF, صور, صوت, فيديو MP4, و Word`);
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        // Auto-fill title if empty
        const currentTitle = control._defaultValues.title || control._formValues.title;
        if (!currentTitle) {
          setValue('title', selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const onSubmit = (data: UploadFormData) => {
    if (!file) {
      setFileError('يجب اختيار ملف للرفع');
      return;
    }

    uploadContent(
      { 
        file, 
        metadata: {
          ...data,
          originalFileName: file.name,
        }
      },
      {
        onSuccess: () => {
          toast.success('تم رفع الملف بنجاح');
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء الرفع');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            رفع محتوى تعليمي
          </h2>
          <button 
            onClick={handleClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* File Drop/Select Area */}
            <div>
              <Label className="mb-2 block text-sm font-bold text-slate-700">الملف المرفق <span className="text-red-500">*</span></Label>
              
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                  }`}
                  onClick={() => !isPending && fileInputRef.current?.click()}
                >
                  <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${fileError ? 'text-red-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-slate-700 mb-1">اضغط لاختيار ملف</p>
                  <p className="text-xs text-slate-500 mb-3">الحد الأقصى: 100 ميجابايت (PDF, Word, MP4, MP3, صور)</p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4"
                    disabled={isPending}
                  />
                  
                  {fileError && <p className="text-red-500 text-sm font-medium">{fileError}</p>}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-primary/10 text-primary w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!isPending && (
                    <button 
                      type="button" 
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-sm font-bold text-slate-700">عنوان الملف <span className="text-red-500">*</span></Label>
                <Input 
                  {...register('title')} 
                  placeholder="مثال: ملخص الوحدة الأولى"
                  className={errors.title ? 'border-red-500' : ''}
                  disabled={isPending}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1 font-medium">{errors.title.message}</p>}
              </div>
              
              <div>
                <Label className="mb-2 block text-sm font-bold text-slate-700">نوع المحتوى <span className="text-red-500">*</span></Label>
                <select 
                  {...register('contentType')}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  disabled={isPending}
                >
                  <option value={ContentType.FILE}>ملف عام</option>
                  <option value={ContentType.SUMMARY}>ملخص</option>
                  <option value={ContentType.REFERENCE}>مرجع إضافي</option>
                  <option value={ContentType.LECTURE_RECORDING}>محاضرة مسجلة (فيديو)</option>
                </select>
                {errors.contentType && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contentType.message}</p>}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-bold text-slate-700">وصف إضافي (اختياري)</Label>
              <Textarea 
                {...register('description')} 
                placeholder="أضف وصفاً لمحتوى الملف..."
                rows={2}
                disabled={isPending}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-bold text-slate-700">تخصيص لمجموعة (اختياري)</Label>
              <select 
                {...register('groupId')}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                disabled={isPending}
              >
                <option value="">-- بدون تخصيص (متاح للجميع) --</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} - {group.gradeLevel}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">إذا قمت باختيار مجموعة، سيرى طلاب هذه المجموعة فقط هذا الملف.</p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending || !file}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 ml-2" />
                    رفع وحفظ
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
