'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { SearchableSessionCombobox } from '@/features/attendance/components/SearchableSessionCombobox';
import { CreateSessionModal } from '@/features/schedules/components/CreateSessionModal';
import { Plus, SlidersHorizontal, Calendar } from 'lucide-react';
import { useTeacherAttendancePage } from '../hooks/useTeacherAttendancePage';
import { AttendanceFilterDrawer } from './AttendanceFilterDrawer';
import { AttendanceActiveSessionCard } from './AttendanceActiveSessionCard';
import { AttendanceWorkspace } from './AttendanceWorkspace';

export function TeacherAttendanceContent() {
  const {
    paramSessionId,
    selectedStages,
    selectedGrades,
    setSelectedGrades,
    selectedLocations,
    setSelectedLocations,
    selectedSessionId,
    sessionScope,
    setSessionScope,
    activeTab,
    setActiveTab,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    activeYear,
    activeTerm,
    isLoadingSessions,
    isErrorSessions,
    isLoadingAllSessions,
    groupMap,
    availableLocations,
    availableGradeOptions,
    handleStagesChange,
    filteredAllSessions,
    displaySessions,
    scopeCountLabel,
    report,
    isLoadingReport,
    isErrorReport,
    resetFilters,
    activeFiltersCount,
    activeSessionObj,
    activeGroup,
    isTooEarly,
    isEnded,
    handleSelectSession,
  } = useTeacherAttendancePage();

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Header (Compact) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">رصد الحضور والغياب</h1>
          <p className="mt-1 text-slate-500 text-sm">أداة تسجيل حضور الطلاب للحصة الحالية.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <div className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 rounded-lg shadow-xs">
            {activeYear || '2026-2027'}
          </div>
          <div className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 rounded-lg shadow-xs">
            {activeTerm === 'SECOND_TERM' ? 'الترم الثاني' : 'الترم الأول'}
          </div>
        </div>
      </div>

      {/* 2. Primary Session Selector & Scope Bar */}
      <div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 mb-2.5 w-fit">
          <button
            type="button"
            onClick={() => setSessionScope('TODAY')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              sessionScope === 'TODAY'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'hover:text-slate-900'
            }`}
          >
            حصص اليوم
          </button>
          <button
            type="button"
            onClick={() => setSessionScope('WEEK')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              sessionScope === 'WEEK'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'hover:text-slate-900'
            }`}
          >
            مجاميع هذا الأسبوع ({sessionScope === 'WEEK' ? displaySessions.length : filteredAllSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setSessionScope('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              sessionScope === 'ALL'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'hover:text-slate-900'
            }`}
          >
            جميع حصص الترم
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            {isErrorSessions ? (
              <p className="text-red-500 text-xs">فشل تحميل الحصص.</p>
            ) : (
              <SearchableSessionCombobox
                label={
                  sessionScope === 'WEEK'
                    ? 'حصص الأسبوع الحالي (مفتوحة للتسجيل والتعديل طوال الأسبوع)'
                    : 'الحصة المحددة'
                }
                countLabel={scopeCountLabel}
                sessions={displaySessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={handleSelectSession}
                placeholder="-- اختر الحصة --"
                isLoading={sessionScope === 'TODAY' ? isLoadingSessions : isLoadingAllSessions}
                isTodayPicker={sessionScope === 'TODAY'}
                groupMap={groupMap}
                className="w-full"
              />
            )}
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full md:w-auto h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 ml-1.5" />
              إضافة حصة اليوم
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="w-full md:w-auto h-11 rounded-xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 relative"
            >
              <SlidersHorizontal className="w-4 h-4 ml-2" />
              فلاتر متقدمة
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Filter Drawer Overlay */}
      <AttendanceFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        activeFiltersCount={activeFiltersCount}
        resetFilters={resetFilters}
        selectedStages={selectedStages}
        onStagesChange={handleStagesChange}
        availableGradeOptions={availableGradeOptions}
        selectedGrades={selectedGrades}
        onGradesChange={setSelectedGrades}
        availableLocations={availableLocations}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
        filteredAllSessions={filteredAllSessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        isLoadingAllSessions={isLoadingAllSessions}
        groupMap={groupMap}
      />

      {/* 4. Active Session Context & Workspace */}
      {selectedSessionId ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <AttendanceActiveSessionCard
            activeSessionObj={activeSessionObj}
            activeGroup={activeGroup}
            paramSessionId={paramSessionId}
            report={report}
            isLoadingReport={isLoadingReport}
            isErrorReport={isErrorReport}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <AttendanceWorkspace
            isTooEarly={isTooEarly}
            isEnded={isEnded}
            activeTab={activeTab}
            activeSessionObj={activeSessionObj}
            selectedSessionId={selectedSessionId}
            activeGroupId={activeGroup?.id}
            onSwitchToLogbook={() => setActiveTab('LOGBOOK')}
          />
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed text-center">
          <Calendar className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">لا توجد حصة محددة</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            {activeFiltersCount > 0
              ? 'لا توجد حصص مطابقة للفلاتر المحددة. جرب إعادة ضبط الفلاتر.'
              : 'اختر حصة من القائمة للبدء في رصد الحضور.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 ml-1.5" />
              إضافة حصة جديدة اليوم
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={resetFilters} className="rounded-xl">
                إعادة ضبط الفلاتر
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 5. Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialDate={new Date().toISOString().split('T')[0]}
        initialTime={`${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`}
      />
    </div>
  );
}
