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

    if (file.size > 2000 * 1024 * 1024) {
      toast.error('حجم الفيديو يتجاوز 2 جيجابايت');
      return;
    }

    try {
      setIsUploadingVideo(true);
      setVideoUploadProgress(5);

      const creds = await coursesApi.getVideoUploadCredentials(title.trim() || file.name);
      setVideoUploadProgress(15);

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', creds.uploadUrl);
      xhr.setRequestHeader('AccessKey', creds.accessKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 80) + 15;
          setVideoUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideoUploadProgress(100);
          setIsUploadingVideo(false);
          setBunnyVideoId(creds.videoId);
          toast.success('تم رفع الفيديو بنجاح وجاري بدء المعالجة السحابية');
        } else {
          setIsUploadingVideo(false);
          toast.error('تعذر رفع الفيديو');
        }
      };

      xhr.onerror = () => {
        setIsUploadingVideo(false);
        toast.error('حدث خطأ في الاتصال أثناء رفع الفيديو');
      };

      xhr.send(file);
    } catch {
      setIsUploadingVideo(false);
      toast.error('تعذر الحصول على تصريح رفع الفيديو');
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الدرس');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      lessonType,
      bunnyVideoId: bunnyVideoId || undefined,
      videoDurationSeconds: videoDurationSeconds || undefined,
      isPreview: isFreePreview,
      lessonQuizId: lessonQuizId || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'تعديل محتوى وتفاصيل الدرس' : 'إضافة درس تعليمي جديد'}
              </h2>
              <p className="text-xs text-slate-500">إعداد الشرح، الفيديو، الملخصات والاختبارات التفاعلية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Pill Tab Navigation */}
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'video'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>الفيديو والشرح</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'summary'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>الملخص والملاحظات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'attachments'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والملخصات</span>
              {lesson?.attachments && lesson.attachments.length > 0 && (
                <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {lesson.attachments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'quiz'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>اختبار الدرس</span>
              {lessonQuizId && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 overflow-y-auto space-y-4 text-right flex-1 bg-white">
          {/* TAB 1: VIDEO & METADATA (NO MANUAL ID INPUT) */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان الدرس <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الدرس الأول: شرح كان وأخواتها بالتفصيل"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  أهداف ونبذة عن الدرس
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="النقاط الرئيسية التي سيتم شرحها خلال هذا الدرس..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
              </div>

              {/* Direct Drag & Drop Video Upload Area */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-primary-600" />
                    فيديو الشرح التفاعلي المشفر
                  </span>
                  {bunnyVideoId && (
                    <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>تم ربط وتجهيز الفيديو بنجاح</span>
                    </span>
                  )}
                </div>

                {/* Direct Upload Dropzone */}
                <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDirectVideoUpload}
                    disabled={isUploadingVideo}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <UploadCloud className="w-10 h-10 text-primary-600" />
                    <p className="text-xs font-bold text-slate-800">
                      انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى السيرفر السحابي المشفر
                    </p>
                    <p className="text-[11px] text-slate-500">
                      يتم التشفير الآمن والتقطيع التلقائي بجودات متعددة ضد التسجيل والقرصنة
                    </p>
                  </div>
                </div>

                {isUploadingVideo && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>جاري رفع الفيديو وتجهيز البث السحابي...</span>
                      <span className="font-mono text-primary-600">{videoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Duration & Free Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    مدة الفيديو (بالثواني)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={videoDurationSeconds}
                      onChange={(e) => setVideoDurationSeconds(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono"
                    />
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {Math.floor(videoDurationSeconds / 60)} دقيقة و {videoDurationSeconds % 60} ثانية
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl my-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-900">معاينة مجانية للجميع</p>
                    <p className="text-[10px] text-slate-500">إتاحة مشاهدة هذا الدرس لجميع الزوار بدون اشتراك</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFreePreview}
                    onChange={(e) => setIsFreePreview(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 bg-white border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RICH SUMMARY / NOTES */}
          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  ملخص الدرس وملاحظات المذاكرة
                </label>
                <span className="text-[11px] text-primary-600">يدعم تنسيق العناوين والنقاط</span>
              </div>
              <textarea
                rows={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اكتب هنا القوانين الهامة، الملاحظات الإعرابية، ملخص القواعد ونقاط التميز ليقرأها الطالب أسفل مشغل الفيديو..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                يظهر هذا الملخص في تبويب 📖 "ملخص الدرس والملاحظات" للطالب أثناء مشاهدة الشرح.
              </p>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS & DOCUMENTS (DIRECT UPLOADS ONLY) */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">الملفات والمذكرات المرفقة بالدرس</h3>
                {lesson && !isAddingAttachment && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAttachment(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ملف جديد</span>
                  </button>
                )}
              </div>

              {!lesson && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
                  يرجى حفظ الدرس أولاً لتتمكن من رفع وإرفاق الملفات والمستندات وأوراق العمل.
                </div>
              )}

              {/* Add Attachment with FileUploadZone */}
              {isAddingAttachment && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-slate-900">إضافة مستند أو ملخص جديد للدرس</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم المرفق (مثال: ملخص القوانين وأوراق العمل)
                    </label>
                    <input
                      type="text"
                      value={newAttachmentTitle}
                      onChange={(e) => setNewAttachmentTitle(e.target.value)}
                      placeholder="ملخص الحصة وأوراق العمل"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                    />
                  </div>

                  {/* Direct Presigned Document Uploader */}
                  <FileUploadZone
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    folder="courses"
                    label="رفع الملف المرفق (مستند / ورقة عمل)"
                    description="اسحب وأفلت الملف هنا للرفع السحابي الفوري"
                    currentFileUrl={newAttachmentUrl}
                    currentFileKey={newAttachmentKey}
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
                      onClick={() => {
                        if (newAttachmentKey || newAttachmentUrl) {
                          coursesApi.deleteUploadedFile(newAttachmentKey || newAttachmentUrl);
                        }
                        setNewAttachmentTitle('');
                        setNewAttachmentUrl('');
                        setNewAttachmentKey('');
                        setNewAttachmentSize(undefined);
                        setIsAddingAttachment(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      disabled={addAttachmentMutation.isPending || !newAttachmentUrl}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
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
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{att.title}</p>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary-600 hover:underline flex items-center gap-1 mt-0.5"
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
              <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      ربط اختبار سريع أو واجب خاص بهذا الدرس
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      يظهر هذا الاختبار للطالب في نافذة المشغل فور انتهائه من مشاهدة الفيديو لقياس مستوى الفهم.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    اختر الاختبار أو الواجب المرتبط:
                  </label>
                  <select
                    value={lessonQuizId}
                    onChange={(e) => setLessonQuizId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
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
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveLesson}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
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
