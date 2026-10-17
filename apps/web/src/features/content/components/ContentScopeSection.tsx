'use client';

import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Calendar, Layers, BookOpen } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { STAGE_OPTIONS } from '../constants/contentConstants';
import { formatArabicTime12H } from '@/features/schedules/utils/time.utils';

interface ContentScopeSectionProps {
  register: UseFormRegister<any>;
  selectedStage: string;
  handleStageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedGradeLevel: string | undefined;
  handleGradeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableGrades: { value: string; label: string }[];
  selectedTargetScope: string;
  filteredGroups: any[];
  semesterSessions: any[];
  dbTopics: string[];
  selectedSessionId: string | undefined;
  sessionTopicValue: string | undefined;
  handleLessonSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isLoadingSessions: boolean;
  isPending: boolean;
  activeYear?: string;
  activeTerm?: string;
}

export function ContentScopeSection({
  register,
  selectedStage,
  handleStageChange,
  selectedGradeLevel,
  handleGradeChange,
  availableGrades,
  selectedTargetScope,
  filteredGroups,
  semesterSessions,
  dbTopics,
  selectedSessionId,
  sessionTopicValue,
  handleLessonSelectChange,
  isLoadingSessions,
  isPending,
  activeYear,
  activeTerm,
}: ContentScopeSectionProps) {
  return (
    <>
      {/* Informative Current Academic Period Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Calendar className="w-4 h-4 text-primary-600 shrink-0" />
          <span>العام الدراسي الحالي:</span>
          <span className="text-primary-700 font-extrabold">{activeYear}</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">
            {activeTerm === 'SECOND_TERM' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          سيتم ربط الملف بهذه الفترة تلقائياً
        </span>
      </div>

      {/* Scope / Stage, Grade & Session Scoping */}
      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Layers className="w-4 h-4 text-primary-600" />
          <span>تحديد المرحلة والصف الدراسي ونطاق الظهور:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Academic Stage */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-slate-700">
              المرحلة الدراسية
            </Label>
            <select
              value={selectedStage}
              onChange={handleStageChange}
              disabled={isPending}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
            >
              {STAGE_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-slate-700">
              الصف الدراسي <span className="text-red-500">*</span>
            </Label>
            <select
              {...register('gradeLevel')}
              value={selectedGradeLevel || ''}
              onChange={handleGradeChange}
              disabled={isPending}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
            >
              <option value="">-- اختر الصف الدراسي --</option>
              {availableGrades.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Scope */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-slate-700">
              نطاق الظهور والمشاركة
            </Label>
            <select
              {...register('targetScope')}
              disabled={isPending}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:opacity-75"
            >
              <option value="ALL_GRADE_GROUPS">جميع مجموعات هذا الصف الدراسي</option>
              <option value="SPECIFIC_GROUP">مجموعة معينة فقط</option>
              <option value="GENERAL">عام لجميع المراحل</option>
            </select>
          </div>
        </div>

        {/* If Specific Group is selected */}
        {selectedTargetScope === 'SPECIFIC_GROUP' && (
          <div className="pt-2">
            <Label className="mb-1 block text-xs font-bold text-slate-700">
              اختر المجموعة {activeYear ? `(للعام الحالي ${activeYear})` : ''} <span className="text-red-500">*</span>
            </Label>
            <select
              {...register('groupId')}
              disabled={isPending}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:opacity-75"
            >
              <option value="">-- اختر مجموعة --</option>
              {filteredGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.gradeLevel})
                </option>
              ))}
            </select>
            {filteredGroups.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                لا توجد مجموعات مسجلة لهذا الصف في العام الدراسي الحالي ({activeYear}).
              </p>
            )}
          </div>
        )}

        {/* Session / Lesson Topic */}
        <div className="pt-2 space-y-2">
          <Label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary-600" />
              اختيار الدرس أو الحصة المرتبطة:
            </span>
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
              {isLoadingSessions
                ? 'جاري التحميل...'
                : `إجمالي حصص الترم: ${semesterSessions.length} حصة`}
            </span>
          </Label>

          <div>
            <select
              onChange={handleLessonSelectChange}
              disabled={isPending || isLoadingSessions}
              value={
                selectedSessionId
                  ? `SESSION_${selectedSessionId}`
                  : sessionTopicValue && dbTopics.includes(sessionTopicValue)
                  ? `TOPIC_${sessionTopicValue}`
                  : sessionTopicValue
                  ? '__CUSTOM__'
                  : ''
              }
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
            >
              <option value="">-- بدون ربط بحصة محددة (مرفق عام للمنهج) --</option>

              {semesterSessions.length > 0 && (
                <optgroup
                  label={`حصص ${
                    activeTerm === 'SECOND_TERM' ? 'الترم الثاني' : 'الترم الأول'
                  } المجدولة (${semesterSessions.length} حصة)`}
                >
                  {semesterSessions.map((session) => (
                    <option key={session.id} value={`SESSION_${session.id}`}>
                      {session.topic || 'حصة بدون عنوان'} (
                      {session.sessionDate.includes('T')
                        ? session.sessionDate.split('T')[0]
                        : session.sessionDate}
                      {session.startTime ? ` • ${formatArabicTime12H(session.startTime)}` : ''})
                    </option>
                  ))}
                </optgroup>
              )}

              {dbTopics.length > 0 && (
                <optgroup label="عناوين وموضوعات الحصص المسجلة بقاعدة البيانات">
                  {dbTopics.map((topic) => (
                    <option key={topic} value={`TOPIC_${topic}`}>
                      {topic}
                    </option>
                  ))}
                </optgroup>
              )}

              <option value="__CUSTOM__">+ كتابة موضوع درس مخصص يدوياً...</option>
            </select>
          </div>

          <div className="relative">
            <Input
              {...register('sessionTopic')}
              placeholder="عنوان أو موضوع الدرس (مثال: الحصة الأولى - اسم الفاعل وصياغته)"
              disabled={isPending}
              className="text-xs sm:text-sm bg-white disabled:bg-slate-100"
            />
          </div>
          {selectedTargetScope === 'ALL_GRADE_GROUPS' && selectedGradeLevel && (
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              ✓ سيظهر هذا الملف لجميع مجموعات ({selectedGradeLevel}) عند فتح هذا الدرس أو الحصة.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
