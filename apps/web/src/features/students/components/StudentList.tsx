'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Pagination } from '@/components/ui/Pagination';
import { useStudentListState } from '../hooks/useStudentListState';
import { StudentListFilters } from './StudentListFilters';
import { StudentListTable } from './StudentListTable';
import { StudentJoiningTimeline } from './StudentJoiningTimeline';
import { StudentListViewSwitcher, StudentListTab } from './StudentListViewSwitcher';

const StudentDetailsModal = dynamic(
  () => import('./StudentDetailsModal').then((mod) => mod.StudentDetailsModal),
  { ssr: false }
);

const StudentPasswordModal = dynamic(
  () => import('./StudentPasswordModal').then((mod) => mod.StudentPasswordModal),
  { ssr: false }
);

export function StudentList() {
  const [activeTab, setActiveTab] = useState<StudentListTab>('LIST');

  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    availableYears,
    selectedYears,
    setSelectedYears,
    availableTerms,
    selectedTerms,
    setSelectedTerms,
    isFiltersOpen,
    setIsFiltersOpen,
    filtersRef,
    selectedStages,
    handleStagesChange,
    availableGradeOptions,
    selectedGrades,
    handleGradesChange,
    availableGroupOptions,
    selectedGroups,
    setSelectedGroups,
    hasActiveFilters,
    totalStudents,
    filteredStudents,
    resetFilters,
    isLoading,
    isError,
    totalPages,
    hasMore,
    cursor,
    handlePageChange,
    selectedStudentForModal,
    setSelectedStudentForModal,
    selectedStudentForPassword,
    setSelectedStudentForPassword,
    getStatusColor,
    getStatusText,
  } = useStudentListState();

  return (
    <div className="space-y-6">
      {/* View Switcher: Table View vs Joining History Timeline */}
      <StudentListViewSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalStudents={totalStudents}
      />

      {activeTab === 'HISTORY' ? (
        <StudentJoiningTimeline
          totalStudents={totalStudents}
          onSelectStudent={(id) => setSelectedStudentForModal(id)}
        />
      ) : (
        <>
          {/* Filters Toolbar */}
          <StudentListFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCurrentPage={setCurrentPage}
        availableYears={availableYears}
        selectedYears={selectedYears}
        setSelectedYears={setSelectedYears}
        availableTerms={availableTerms}
        selectedTerms={selectedTerms}
        setSelectedTerms={setSelectedTerms}
        isFiltersOpen={isFiltersOpen}
        setIsFiltersOpen={setIsFiltersOpen}
        filtersRef={filtersRef}
        selectedStages={selectedStages}
        handleStagesChange={handleStagesChange}
        availableGradeOptions={availableGradeOptions}
        selectedGrades={selectedGrades}
        handleGradesChange={handleGradesChange}
        availableGroupOptions={availableGroupOptions}
        selectedGroups={selectedGroups}
        setSelectedGroups={setSelectedGroups}
        hasActiveFilters={hasActiveFilters}
        totalStudents={totalStudents}
        filteredCount={filteredStudents.length}
        resetFilters={resetFilters}
      />

      {/* Table & Mobile Cards Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <StudentListTable
          isLoading={isLoading}
          isError={isError}
          filteredStudents={filteredStudents}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
          onSelectStudent={(id) => setSelectedStudentForModal(id)}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
        />

        {/* Pagination Controls */}
        {(totalPages > 1 || hasMore || cursor || (totalStudents && totalStudents > PAGE_SIZE)) && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalStudents}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              itemLabel="طالب"
            />
          </div>
        )}
      </div>
      </>
      )}

      {/* Quick View Student Modal */}
      {selectedStudentForModal && (
        <StudentDetailsModal
          studentId={selectedStudentForModal}
          isOpen={!!selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* Quick Student Password & Credentials Modal */}
      {selectedStudentForPassword && (
        <StudentPasswordModal
          studentId={selectedStudentForPassword?.id || null}
          studentName={selectedStudentForPassword?.name || 'الطالب'}
          isOpen={!!selectedStudentForPassword}
          onClose={() => setSelectedStudentForPassword(null)}
        />
      )}
    </div>
  );
}
