'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Users,
  FileText,
  FileDown,
  Play,
  UploadCloud,
  Edit3,
  Trash2,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
} from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import { useDeleteSession, useUpdateSession } from '../hooks/useSchedules';
import { formatArabicTime12H } from '../utils/time.utils';
import { VideoPlayerModal } from '@/features/content/components/VideoPlayerModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { BannerAlert } from '@/components/ui/BannerAlert';

interface SessionDetailsModalProps {
  isOpen: boolean;
  session: LessonSessionItem | null;
  onClose: () => void;
  onEdit: (session: LessonSessionItem) => void;
  onUploadAttachment: (session: LessonSessionItem) => void;
}

export function SessionDetailsModal({
  isOpen,
  session,
  onClose,
  onEdit,
  onUploadAttachment,
}: SessionDetailsModalProps) {
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [isCancellingMode, setIsCancellingMode] = useState(false);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const { mutate: deleteSessionMutate, isPending: isDeleting } = useDeleteSession();
  const { mutate: updateSessionMutate, isPending: isUpdating } = useUpdateSession();

  if (!isOpen || !session) return null;

  const formatArabicFullDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = cleanDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const cleanSessionDate = session.sessionDate.includes('T')
    ? session.sessionDate.split('T')[0]
    : session.sessionDate;

  const isToday = cleanSessionDate === todayStr;
  const isUpcoming = cleanSessionDate > todayStr;
  const isPast = cleanSessionDate < todayStr;

  const handleCancelSessionForDay = () => {
    updateSessionMutate(
      {
        id: session.id,
        payload: {
          isCancelled: true,
          cancellationReason: cancellationReasonInput.trim() || 'إلغاء الحصة لهذا اليوم',
        },
      },
      {
        onSuccess: () => {
          toast.success('تم تحديد الحصة كملغاة لهذا اليوم');
          setIsCancellingMode(false);
          setCancellationReasonInput('');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'فشل إلغاء الحصة');
        },
      },
    );
  };

  const handleReactivateSession = () => {
    updateSessionMutate(
      {
        id: session.id,
        payload: {
          isCancelled: false,
          cancellationReason: null,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم إلغاء حالة الإلغاء وتفعيل الحصة بنجاح');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'فشل تفعيل الحصة');
        },
      },
    );
  };

  const handleDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف الحصة "${session.topic || 'حصة'}" نهائياً من قاعدة البيانات؟`)) {
      deleteSessionMutate(session.id, {
        onSuccess: () => {
          toast.success('تم حذف الحصة بنجاح');
          onClose();
        },
        onError: (err: any) => toast.error(err.message || 'فشل حذف الحصة'),
      });
    }
  };

  const getContentTypeIcon = (type?: string, mime?: string | null) => {
    if (type === 'LECTURE_RECORDING' || mime?.startsWith('video/')) {
      return <VideoIcon className="w-4 h-4 text-purple-600" />;
    }
    if (mime?.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-emerald-600" />;
    }
    if (mime?.startsWith('audio/')) {
      return <Music className="w-4 h-4 text-amber-600" />;
    }
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  const isBunnyVideo = (item: any) => {
    return item.fileKey?.startsWith('bunny:') || item.fileUrl?.includes('iframe.mediadelivery.net');
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between">
            <div className="space-y-1.5 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                {session.isCancelled ? (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    حصة ملغاة لهذا اليوم
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                      isToday
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse'
                        : isUpcoming
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isToday ? 'حصة اليوم' : isUpcoming ? 'حصة قادمة' : 'حصة سابقة'}
                  </span>
                )}

                {session.group && (
                  <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
                    {session.group.name} • {session.group.gradeLevel}
                  </span>
                )}
              </div>

              <h2
                className={`text-xl font-black leading-snug ${
                  session.isCancelled ? 'text-rose-900 line-through decoration-rose-400' : 'text-slate-900'
                }`}
              >
                {session.topic || 'حصة بدون عنوان'}
              </h2>

              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                <span>{formatArabicFullDate(session.sessionDate)}</span>
                {session.startTime && (
                  <span className="text-slate-700 font-bold">
                    • من {formatArabicTime12H(session.startTime)}{' '}
                    {session.endTime ? `إلى ${formatArabicTime12H(session.endTime)}` : ''}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Prominent Cancellation Alert or Action Banner */}
            {session.isCancelled ? (
              <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-2xs animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-extrabold text-xs text-rose-900">
                      ⚠️ تم إلغاء هذه الحصة لهذا اليوم
                    </span>
                  </div>
                  {session.cancellationReason && (
                    <p className="text-xs text-rose-800 font-semibold pr-4">
                      سبب الإلغاء: {session.cancellationReason}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs shrink-0 self-start sm:self-auto font-bold"
                  onClick={handleReactivateSession}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'جاري التفعيل...' : 'إعادة تفعيل الحصة'}
                </Button>
              </div>
            ) : isCancellingMode ? (
              <div className="p-4 bg-rose-50/95 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-900">
                    تأكيد إلغاء الحصة لهذا اليوم ({cleanSessionDate})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCancellingMode(false);
                      setCancellationReasonInput('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                  >
                    تراجع
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="سبب الإلغاء (اختياري: عطلة رسمية، اعتذار المعلم...)"
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                  className="bg-white text-xs h-9"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setIsCancellingMode(false);
                      setCancellationReasonInput('');
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                    onClick={handleCancelSessionForDay}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحصة'}
                  </Button>
                </div>
              </div>
            ) : null}
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">المرفقات والمذكرات</p>
                  <p className="text-base font-black text-slate-800">
                    {session.educationalContents?.length || session._count?.educationalContents || 0} ملفات
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">سجل الحضور</p>
                  <p className="text-base font-black text-slate-800">
                    {session._count?.attendanceRecords || 0} حاضرين
                  </p>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  المذكرات والمرفقات والفيديوهات المرتبطة بالحصة
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUploadAttachment(session);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  + رفع ملف جديد
                </button>
              </div>

              {session.educationalContents && session.educationalContents.length > 0 ? (
                <div className="space-y-2">
                  {session.educationalContents.map((content) => (
                    <div
                      key={content.id}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-primary-200 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          {getContentTypeIcon(content.contentType, content.mimeType)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                            {content.title}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {content.fileSize ? `${(content.fileSize / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                            {content.contentType === 'LECTURE_RECORDING' ? 'فيديو محاضرة' : 'مستند ومذكرة'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBunnyVideo(content) ? (
                          <button
                            type="button"
                            onClick={() => setActiveVideo(content)}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                            مشاهدة
                          </button>
                        ) : (
                          <a
                            href={content.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            تحميل
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50 space-y-2">
                  <p className="text-xs font-bold text-slate-600">لا توجد مذكرات أو ملفات مرفوعة لهذه الحصة بعد</p>
                  <p className="text-[11px] text-slate-400">
                    يمكنك رفع مذكرة الشرح، الواجب المنزلي، أو تسجيل فيديو الحصة مباشرة
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onUploadAttachment(session);
                    }}
                    className="mt-2 text-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5 ml-1.5" />
                    رفع ملزمة أو فيديو للحصة
                  </Button>
                </div>
              )}
            </div>

            {/* Attendance Quick Action */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-900">رصد الحضور والـ QR</p>
                <p className="text-[11px] text-emerald-700">
                  {session._count?.attendanceRecords || 0} طالب تم رصد حضورهم لهذه الحصة
                </p>
              </div>

              <Link
                href="/teacher/attendance"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                رصد الحضور
              </Link>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                حذف الحصة
              </button>

              {!session.isCancelled && !isCancellingMode && (
                <button
                  type="button"
                  onClick={() => setIsCancellingMode(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="تحديد الحصة كملغاة لهذا اليوم"
                >
                  <X className="w-3.5 h-3.5" />
                  إلغاء الحصة لهذا اليوم
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                إغلاق
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(session);
                }}
                className="shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 ml-1.5" />
                تعديل الحصة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          isOpen={!!activeVideo}
          content={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}
