"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCertificatesClient } from "../hooks/useCertificatesClient";
import { CertificateVisibilityPanel } from "./CertificateVisibilityPanel";
import { CertificateFilterBar } from "./CertificateFilterBar";
import { CertificateGrid } from "./CertificateGrid";

export function CertificatesClient() {
  const {
    certificates,
    filteredCertificates,
    visibilityPanelRef,
    searchTerm,
    setSearchTerm,
    selectedStage,
    setSelectedStage,
    selectedYear,
    setSelectedYear,
    selectedGrade,
    setSelectedGrade,
    deletingId,
    togglingId,
    allowedYears,
    setAllowedYears,
    allowedStages,
    setAllowedStages,
    allowedGrades,
    setAllowedGrades,
    allowedGroups,
    setAllowedGroups,
    savingYears,
    yearOptions,
    stageOptions,
    gradeOptions,
    groupOptions,
    stages,
    grades,
    years,
    visibilityDirty,
    toggleAllowed,
    handleSaveVisibility,
    handleDelete,
    handleToggleVisibility,
  } = useCertificatesClient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الشهادات</h1>
          <p className="text-slate-500 mt-1">
            قم بإنشاء وإدارة شهادات التقدير لطلابك
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/teacher/certificates/new" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء شهادة
            </Button>
          </Link>
        </div>
      </div>

      <CertificateVisibilityPanel
        visibilityPanelRef={visibilityPanelRef}
        visibilityDirty={visibilityDirty}
        savingYears={savingYears}
        handleSaveVisibility={handleSaveVisibility}
        yearOptions={yearOptions}
        stageOptions={stageOptions}
        gradeOptions={gradeOptions}
        groupOptions={groupOptions}
        allowedYears={allowedYears}
        setAllowedYears={setAllowedYears}
        allowedStages={allowedStages}
        setAllowedStages={setAllowedStages}
        allowedGrades={allowedGrades}
        setAllowedGrades={setAllowedGrades}
        allowedGroups={allowedGroups}
        setAllowedGroups={setAllowedGroups}
        toggleAllowed={toggleAllowed}
      />

      <CertificateFilterBar
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        stages={stages}
        years={years}
        grades={grades}
      />

      <CertificateGrid
        certificates={certificates}
        filteredCertificates={filteredCertificates}
        deletingId={deletingId}
        togglingId={togglingId}
        handleToggleVisibility={handleToggleVisibility}
        handleDelete={handleDelete}
      />
    </div>
  );
}
