'use client';

import React from 'react';
import {
  X,
  Clock,
  Edit3,
  Trash2,
  QrCode,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import { useSessionDetailsModal } from '../hooks/useSessionDetailsModal';
import { SessionQuickActions } from './session-details/SessionQuickActions';
import { SessionAttachmentsSection } from './session-details/SessionAttachmentsSection';
import { SessionAssessmentsSection } from './session-details/SessionAssessmentsSection';
import { formatArabicTime12H } from '../utils/time.utils';
import { VideoPlayerModal } from '@/features/content/components/VideoPlayerModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
  const {
    activeVideo,
    setActiveVideo,
    isCancellingMode,
    setIsCancellingMode,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    cancellationReasonInput,
    setCancellationReasonInput,
    groupAssessments,
    isDeleting,
    isUpdating,
    cleanSessionDate,
    isToday,
    isUpcoming,
    formatArabicFullDate,
    buildAssessmentLink,
    handleCancelSessionForDay,
    handleReactivateSession,
    handleDelete,
  } = useSessionDetailsModal({ session, onClose });

  if (!isOpen || !session) return null;

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
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0 cursor-pointer"
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
                      تم إلغاء هذه الحصة لهذا اليوم
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
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
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
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    onClick={handleCancelSessionForDay}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحصة'}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Top Quick Actions: Attendance QR, Payments QR & Homework/Exams */}
            <SessionQuickActions
              session={session}
              groupAssessments={groupAssessments}
            />

            {/* Quick Metrics Bar (المرفقات، التقييمات، الحضور) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 truncate">المرفقات</p>
                  <p className="text-sm font-black text-slate-800">
                    {session.educationalContents?.length || session._count?.educationalContents || 0} ملفات
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 truncate">التقييمات</p>
                  <p className="text-sm font-black text-slate-800">
                    {groupAssessments.length} تقييم
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 truncate">الحضور</p>
                  <p className="text-sm font-black text-slate-800">
                    {session._count?.attendanceRecords || 0} حاضرين
                  </p>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <SessionAttachmentsSection
              session={session}
              onUploadAttachment={onUploadAttachment}
              onClose={onClose}
              onPlayVideo={setActiveVideo}
            />

            {/* Homework & Assessments Section */}
            <SessionAssessmentsSection
              groupAssessments={groupAssessments}
              buildAssessmentLink={buildAssessmentLink}
            />
          </div>

          {/* Footer Actions */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              {!session.scheduleId && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isDeleting}
                  className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الحصة
                </button>
              )}

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
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 sm:flex-initial">
                إغلاق
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(session);
                }}
                className="shadow-xs flex-1 sm:flex-initial cursor-pointer"
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

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="تأكيد حذف الحصة"
        message={`هل أنت متأكد من حذف الحصة "${session.topic || 'حصة'}" نهائياً من جدول الحصص وقاعدة البيانات؟`}
        confirmText="حذف الحصة نهائياً"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}

export default SessionDetailsModal;
