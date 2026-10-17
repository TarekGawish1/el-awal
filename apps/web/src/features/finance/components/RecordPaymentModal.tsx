'use client';

import React from 'react';
import { X, DollarSign, BookOpen, CreditCard, QrCode } from 'lucide-react';
import { useRecordPaymentModalState } from '../hooks/useRecordPaymentModalState';
import { RecordPaymentFilterSection } from './RecordPaymentFilterSection';
import { RecordPaymentStudentSection } from './RecordPaymentStudentSection';
import { RecordPaymentAmountSection } from './RecordPaymentAmountSection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToQr?: () => void;
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  allStudents?: Array<{
    id: string;
    fullName: string;
    studentCode?: string;
    gradeLevel: string;
    groupId?: string;
    initialGroupId?: string;
    groupIds?: string[];
  }>;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSwitchToQr,
  groupId: initialGroupId = '',
  periodYear: initialPeriodYear,
  periodMonth: initialPeriodMonth,
  allStudents = [],
}: Props) {
  const {
    paymentType,
    handlePaymentTypeChange,
    selectedStage,
    handleStageChange,
    selectedGradeLevel,
    handleGradeChange,
    availableGrades,
    filteredGroups,
    selectedGroupId,
    handleGroupChange,
    selectedAcademicTerm,
    handleTermChange,
    currentPeriodMonth,
    setCurrentPeriodMonth,
    showOnlyUnpaid,
    setShowOnlyUnpaid,
    studentSearchQuery,
    setStudentSearchQuery,
    selectedStudentId,
    handleStudentChange,
    filteredStudents,
    selectedBookletId,
    handleBookletChange,
    eligibleBooklets,
    booklets,
    selectedStudent,
    groupFee,
    isPending,
    isDefaultersLoading,
    isEnrollmentsLoading,
    isBookletsLoading,
    isBookletAlreadyPaid,
    isPreviouslyPartial,
    previouslyPaid,
    currentExpectedAmount,
    currentEnteredAmount,
    totalCumulativePaid,
    remainingDue,
    isFullPayment,
    isPartialPayment,
    getStudentBookletPaymentStatus,
    setValue,
    register,
    handleSubmit,
    errors,
    onSubmit,
  } = useRecordPaymentModalState({
    initialGroupId,
    initialPeriodYear,
    initialPeriodMonth,
    allStudents,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {paymentType === 'BOOKLET' ? (
              <BookOpen className="w-5 h-5 text-purple-600" />
            ) : (
              <DollarSign className="w-5 h-5 text-primary" />
            )}
            تسجيل مصروف / سداد
          </h2>
          <div className="flex items-center gap-2">
            {onSwitchToQr && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToQr();
                }}
                className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>الماسح السريع (QR)</span>
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isPending}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('TUITION')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'TUITION'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              اشتراك شهري / حصص
            </button>
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('BOOKLET')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'BOOKLET'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              سداد قيمة مذكرة
            </button>
          </div>

          <RecordPaymentFilterSection
            selectedStage={selectedStage}
            onStageChange={handleStageChange}
            selectedGradeLevel={selectedGradeLevel}
            onGradeChange={handleGradeChange}
            availableGrades={availableGrades}
            selectedAcademicTerm={selectedAcademicTerm}
            onTermChange={handleTermChange}
            currentPeriodMonth={currentPeriodMonth}
            onPeriodMonthChange={setCurrentPeriodMonth}
            selectedGroupId={selectedGroupId}
            onGroupChange={handleGroupChange}
            filteredGroups={filteredGroups}
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <RecordPaymentStudentSection
              paymentType={paymentType}
              selectedGroupId={selectedGroupId}
              filteredStudents={filteredStudents}
              showOnlyUnpaid={showOnlyUnpaid}
              onToggleShowOnlyUnpaid={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
              studentSearchQuery={studentSearchQuery}
              onStudentSearchQueryChange={setStudentSearchQuery}
              selectedStudentId={selectedStudentId}
              onStudentChange={handleStudentChange}
              selectedBookletId={selectedBookletId}
              onBookletChange={handleBookletChange}
              eligibleBooklets={eligibleBooklets}
              booklets={booklets}
              selectedStudent={selectedStudent}
              groupFee={groupFee}
              isPending={isPending}
              isDefaultersLoading={isDefaultersLoading}
              isEnrollmentsLoading={isEnrollmentsLoading}
              isBookletsLoading={isBookletsLoading}
              isBookletAlreadyPaid={isBookletAlreadyPaid}
              getStudentBookletPaymentStatus={getStudentBookletPaymentStatus}
              studentIdError={errors.studentId?.message}
              bookletIdError={errors.bookletId?.message}
            />

            <RecordPaymentAmountSection
              register={register}
              errors={errors}
              isPending={isPending}
              selectedStudentId={selectedStudentId}
              selectedStudent={selectedStudent}
              groupFee={groupFee}
              paymentType={paymentType}
              isBookletAlreadyPaid={isBookletAlreadyPaid}
              isPreviouslyPartial={isPreviouslyPartial}
              previouslyPaid={previouslyPaid}
              currentExpectedAmount={currentExpectedAmount}
              currentEnteredAmount={currentEnteredAmount}
              totalCumulativePaid={totalCumulativePaid}
              remainingDue={remainingDue}
              isFullPayment={isFullPayment}
              isPartialPayment={isPartialPayment}
              onSetAmountPaid={(amt) => setValue('amountPaid', amt)}
              onClose={onClose}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
