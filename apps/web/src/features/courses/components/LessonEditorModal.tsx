'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  FileText,
  Paperclip,
  Award,
  UploadCloud,
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import { CourseLesson, LessonAttachment } from '../types/courses.types';
import {
  useCreateLesson,
  useUpdateLesson,
  useAddAttachment,
  useDeleteAttachment,
} from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
import toast from 'react-hot-toast';

interface LessonEditorModalProps {
  isOpen: boolean;
  courseId: string;
  moduleId: string;
  lesson?: CourseLesson | null;
  onClose: () => void;
}

type TabType = 'video' | 'summary' | 'attachments' | 'quiz';

export function LessonEditorModal({
  isOpen,
  courseId,
  moduleId,
  lesson,
  onClose,
}: LessonEditorModalProps) {
  const isEditing = !!lesson;
  const createMutation = useCreateLesson(courseId);
  const updateMutation = useUpdateLesson(courseId);
  const addAttachmentMutation = useAddAttachment(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const { data: assessmentsData } = useAssessments();
  const assessments = assessmentsData?.data || [];

  const [activeTab, setActiveTab] = useState<TabType>('video');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [lessonType, setLessonType] = useState('VIDEO');
  const [bunnyVideoId, setBunnyVideoId] = useState('');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(1800);
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [lessonQuizId, setLessonQuizId] = useState('');

  // Video Upload State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  // New Attachment State
  const [newAttachmentTitle, setNewAttachmentTitle] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentKey, setNewAttachmentKey] = useState('');
  const [newAttachmentSize, setNewAttachmentSize] = useState<number | undefined>();
  const [newAttachmentType, setNewAttachmentType] = useState<string>('application/pdf');
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDescription(lesson.description || '');
      setSummary(lesson.summary || '');
      setLessonType(lesson.lessonType || 'VIDEO');
      setBunnyVideoId(lesson.bunnyVideoId || '');
      setVideoDurationSeconds(lesson.videoDurationSeconds || 1800);
      setIsFreePreview(lesson.isPreview || false);
      setLessonQuizId(lesson.lessonQuizId || '');
    } else {
      setTitle('');
      setDescription('');
      setSummary('');
      setLessonType('VIDEO');
      setBunnyVideoId('');
      setVideoDurationSeconds(1800);
      setIsFreePreview(false);
      setLessonQuizId('');
    }
  }, [lesson, isOpen]);

  if (!isOpen) return null;

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingVideo(true);
      setVideoUploadProgress(10);

      // Step 1: Get secure upload credentials
      const creds = await coursesApi.getVideoUploadCredentials(title || file.name);
      setVideoUploadProgress(30);

      // Step 2: Upload file directly to secure streaming server
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', creds.uploadUrl);
      xhr.setRequestHeader('AccessKey', creds.accessKey);
      xhr.setRequestHeader('Authorization', creds.authorizationSignature);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 60) + 30;
          setVideoUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setBunnyVideoId(creds.videoId);
          setVideoUploadProgress(100);
          toast.success('تم رفع الفيديو وتجهيز البث المشفر بنجاح');
        } else {
          toast.error('تعذر رفع الفيديو');
        }
        setIsUploadingVideo(false);
      };

      xhr.onerror = () => {
        toast.error('حدث خطأ أثناء نقل الفيديو');
        setIsUploadingVideo(false);
      };

      xhr.send(file);
    } catch {
      toast.error('تعذر إنشاء جلسة رفع الفيديو');
      setIsUploadingVideo(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!title.trim()) {
      toast.error('عنوان الدرس مطلوب');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      lessonType,
      bunnyVideoId: bunnyVideoId.trim() || undefined,
      videoDurationSeconds: Number(videoDurationSeconds) || 0,
      isFreePreview,
      lessonQuizId: lessonQuizId || null,
    };

    try {
      if (isEditing && lesson) {
        await updateMutation.mutateAsync({
          lessonId: lesson.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          moduleId,
          data: payload,
        });
      }
      onClose();
    } catch {
      // Handled by mutation
    }
  };

  const handleAddAttachment = async () => {
    if (!newAttachmentTitle.trim() || !newAttachmentUrl.trim()) {
      toast.error('يرجى كتابة عنوان ورفع الملف');
      return;
    }
    if (!lesson?.id) {
      toast.error('يرجى حفظ الدرس أولاً لإضافة المرفقات');
      return;
    }

    try {
      await addAttachmentMutation.mutateAsync({
        lessonId: lesson.id,
        data: {
          title: newAttachmentTitle.trim(),
          fileUrl: newAttachmentUrl.trim(),
          fileKey: newAttachmentKey || `courses/attachments/${Date.now()}-${newAttachmentTitle.trim()}`,
          fileSize: newAttachmentSize,
          fileType: newAttachmentType || 'application/pdf',
        },
      });
      setNewAttachmentTitle('');
      setNewAttachmentUrl('');
      setNewAttachmentKey('');
      setNewAttachmentSize(undefined);
      setIsAddingAttachment(false);
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-l from-blue-50/50 to-white dark:from-slate-800/60 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'تعديل محتوى وتفاصيل الدرس' : 'إضافة درس تعليمي جديد'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إعداد الشرح، الفيديو، الملخصات والاختبارات التفاعلية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === 'video'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>الفيديو والشرح</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الملخص والملاحظات</span>
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-2 py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>المرفقات والملخصات</span>
            {lesson?.attachments && lesson.attachments.length > 0 && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded-full text-[10px]">
                {lesson.attachments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === 'quiz'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>اختبار الدرس</span>
            {lessonQuizId && (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 overflow-y-auto space-y-4 text-right flex-1">
          {/* TAB 1: VIDEO & METADATA */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  عنوان الدرس <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الدرس الأول: شرح كان وأخواتها بالتفصيل"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  أهداف ونبذة عن الدرس
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="النقاط الرئيسية التي سيتم شرحها خلال هذا الدرس..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Video Upload Section */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    فيديو الشرح التفاعلي المشفر
                  </span>
                  {bunnyVideoId && (
                    <span className="text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      تم تعيين الفيديو: {bunnyVideoId.slice(0, 8)}...
                    </span>
                  )}
                </div>

                {/* Direct Upload Trigger */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white dark:bg-slate-900">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDirectVideoUpload}
                    disabled={isUploadingVideo}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-400">
                    <UploadCloud className="w-9 h-9 text-blue-600 dark:text-blue-400 animate-bounce" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى السيرفر السحابي المشفر
                    </p>
                    <p className="text-[11px] text-slate-500">
                      يتم التشفير الآمن والتقطيع التلقائي بجودات متعددة ضد التسجيل والقرصنة
                    </p>
                  </div>
                </div>

                {isUploadingVideo && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>جاري رفع الفيديو وتجهيز البث السحابي...</span>
                      <span className="font-mono text-blue-600">{videoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    أو أدخل معرف الفيديو المشفر يدوياً:
                  </label>
                  <input
                    type="text"
                    value={bunnyVideoId}
                    onChange={(e) => setBunnyVideoId(e.target.value)}
                    placeholder="مثال: 9f8a7b6c-5d4e-3f2a-1b0c-9e8d7c6b5a4f"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duration & Free Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    مدة الفيديو (بالثواني)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={videoDurationSeconds}
                      onChange={(e) => setVideoDurationSeconds(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white pl-10 focus:outline-none focus:border-blue-500"
                    />
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {Math.floor(videoDurationSeconds / 60)} دقيقة و {videoDurationSeconds % 60} ثانية
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl my-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">معاينة مجانية للجميع</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">إتاحة مشاهدة هذا الدرس لجميع الزوار بدون اشتراك</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFreePreview}
                    onChange={(e) => setIsFreePreview(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RICH SUMMARY / NOTES */}
          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  ملخص الدرس وملاحظات المذاكرة
                </label>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">يدعم تنسيق العناوين والنقاط</span>
              </div>
              <textarea
                rows={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اكتب هنا القوانين الهامة، الملاحظات الإعرابية، ملخص القواعد ونقاط التميز ليقرأها الطالب أسفل مشغل الفيديو..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-sans text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                يظهر هذا الملخص في تبويب 📖 "ملخص الدرس والملاحظات" للطالب أثناء مشاهدة الشرح.
              </p>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS & DOCUMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">الملفات والمذكرات المرفقة بالدرس</h3>
                {lesson && !isAddingAttachment && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAttachment(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ملف جديد</span>
                  </button>
                )}
              </div>

              {!lesson && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                  يرجى حفظ الدرس أولاً لتتمكن من رفع وإرفاق الملفات والمستندات وأوراق العمل.
                </div>
              )}

              {/* Add Attachment with FileUploadZone */}
              {isAddingAttachment && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-blue-200 dark:border-blue-800/40 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">إضافة مستند أو ملخص جديد للدرس</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المرفق (مثال: ملخص القوانين وأوراق العمل)
                    </label>
                    <input
                      type="text"
                      value={newAttachmentTitle}
                      onChange={(e) => setNewAttachmentTitle(e.target.value)}
                      placeholder="ملخص الحصة وأوراق العمل"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Direct Presigned Document Uploader */}
                  <FileUploadZone
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    folder="courses/attachments"
                    label="رفع الملف المرفق (مستند / ورقة عمل)"
                    description="اسحب وأفلت الملف هنا للرفع السحابي الفوري"
                    currentFileUrl={newAttachmentUrl}
                    onUploadComplete={({ fileUrl, fileKey, fileSize, fileType, fileName }) => {
                      setNewAttachmentUrl(fileUrl);
                      setNewAttachmentKey(fileKey);
                      setNewAttachmentSize(fileSize);
                      setNewAttachmentType(fileType || 'application/pdf');
                      if (!newAttachmentTitle) setNewAttachmentTitle(fileName.replace(/\.[^/.]+$/, ''));
                    }}
                    onRemoveFile={() => {
                      setNewAttachmentUrl('');
                      setNewAttachmentKey('');
                      setNewAttachmentSize(undefined);
                    }}
                    fileCategory="document"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingAttachment(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      disabled={addAttachmentMutation.isPending || !newAttachmentUrl}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {addAttachmentMutation.isPending ? 'جاري الحفظ...' : 'حفظ المرفق'}
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments List */}
              <div className="space-y-2">
                {(!lesson?.attachments || lesson.attachments.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد ملفات مرفقة بهذا الدرس حالياً</p>
                ) : (
                  lesson.attachments.map((att: LessonAttachment) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{att.title}</p>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>تحميل / معاينة المستند</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="حذف المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LESSON QUIZ LINKING */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-l from-blue-50/70 to-white dark:from-blue-950/30 dark:to-slate-950 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ربط اختبار سريع أو واجب خاص بهذا الدرس
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      يظهر هذا الاختبار للطالب في نافذة المشغل فور انتهائه من مشاهدة الفيديو لقياس مستوى الفهم.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    اختر الاختبار أو الواجب المرتبط:
                  </label>
                  <select
                    value={lessonQuizId}
                    onChange={(e) => setLessonQuizId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- بدون اختبار لهذا الدرس --</option>
                    {assessments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'} - {a.totalScore} درجة)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveLesson}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md shadow-blue-600/30 disabled:opacity-50 flex items-center gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الدرس للمنهج'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
