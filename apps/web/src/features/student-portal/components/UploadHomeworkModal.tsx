'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useSendHomeworkUpload, useSubmitHomework } from '@/features/student-portal/hooks/useStudentPortal';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = /\.(pdf|png|jpe?g)$/i;

interface UploadHomeworkModalProps {
  assessmentId: string;
  sessionId: string;
  onClose: () => void;
}

export function UploadHomeworkModal({ assessmentId, sessionId, onClose }: UploadHomeworkModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: requestUpload } = useSendHomeworkUpload();
  const { mutateAsync: submitHomework } = useSubmitHomework();

  const validateFile = (candidate: File) => {
    if (!ALLOWED_TYPES.includes(candidate.type) && !ALLOWED_EXT.test(candidate.name)) {
      return 'يُقبل فقط ملفات PDF أو صور PNG / JPG';
    }
    if (candidate.size > MAX_SIZE) {
      return 'حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)';
    }
    return '';
  };

  const handleFileSelect = (candidate?: File | null) => {
    if (!candidate) return;
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(candidate);
  };

  const uploadToR2 = (uploadUrl: string, candidate: File): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', candidate.type || 'application/octet-stream');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setProgress(Math.min(Math.round((event.loaded / event.total) * 100), 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`فشل رفع الملف إلى التخزين السحابي (كود ${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('تعذر الاتصال بخادم التخزين أثناء الرفع'));
      xhr.send(candidate);
    });

  const handleSubmit = async () => {
    if (!file) {
      setError('يرجى اختيار ملف إجابة الواجب أولاً');
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsUploading(true);
    setProgress(0);
    setError('');
    try {
      const presigned = await requestUpload({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
      });
      await uploadToR2(presigned.uploadUrl, file);
      await submitHomework({
        assessmentId,
        payload: {
          sessionId,
          fileKey: presigned.fileKey,
          fileUrl: presigned.publicUrl || presigned.uploadUrl,
          studentNotes: notes.trim() || undefined,
        },
      });
      toast.success('تم رفع إجابة الواجب بنجاح ✅');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء رفع الإجابة، يرجى المحاولة لاحقاً');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-bold text-primary-600">رفع إجابة الواجب</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">إجابة واجب الحصة</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0]); }}
          >
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-600" />
                <FileText className="mb-1 h-6 w-6 text-primary-600" />
                <p className="text-sm font-bold text-slate-800">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
              </div>
            ) : (
              <>
                <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="mt-1 text-xs text-slate-400">PDF / PNG / JPG حتى 25 ميجابايت</p>
              </>
            )}
          </div>

          {isUploading && (
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>جاري رفع الملف إلى التخزين السحابي...</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && <Alert variant="error"><AlertTriangle className="h-4 w-4" /><span>{error}</span></Alert>}

          <label className="block text-xs font-bold text-slate-700">
            ملاحظات الطالب للأستاذ (اختياري)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="مثال: رجاء مراجعة حل التمرين الرابع" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>إلغاء</Button>
            <Button type="button" onClick={handleSubmit} isLoading={isUploading} disabled={!file}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              رفع إجابة الواجب
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadHomeworkModal;
