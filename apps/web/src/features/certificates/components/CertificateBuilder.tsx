"use client";

import React from "react";
import { useCertificateBuilder } from "../hooks/useCertificateBuilder";
import { CertificateFormSection } from "./CertificateFormSection";
import { CertificatePreviewSection } from "./CertificatePreviewSection";

export function CertificateBuilder() {
  const {
    data,
    setData,
    isGenerating,
    scale,
    setScale,
    showSuggestions,
    setShowSuggestions,
    studentSuggestions,
    isLoadingStudents,
    selectedGroupId,
    setSelectedGroupId,
    isLoadingGroups,
    filteredGroups,
    containerRef,
    certificateRef,
    handleGroupChange,
    handleChange,
    handleReset,
    handleGenerate,
  } = useCertificateBuilder();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6 order-2 xl:order-1">
          <CertificateFormSection
            data={data}
            setData={setData}
            isGenerating={isGenerating}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            studentSuggestions={studentSuggestions}
            isLoadingStudents={isLoadingStudents}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            isLoadingGroups={isLoadingGroups}
            filteredGroups={filteredGroups}
            handleGroupChange={handleGroupChange}
            handleChange={handleChange}
            handleReset={handleReset}
            handleGenerate={handleGenerate}
          />
        </div>

        <div className="xl:col-span-8 order-1 xl:order-2">
          <CertificatePreviewSection
            scale={scale}
            setScale={setScale}
            containerRef={containerRef}
            certificateRef={certificateRef}
            data={data}
          />
        </div>
      </div>
    </div>
  );
}
