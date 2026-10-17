"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

interface CertificateVisibilityPanelProps {
  visibilityPanelRef: React.RefObject<HTMLDivElement | null>;
  visibilityDirty: boolean;
  savingYears: boolean;
  handleSaveVisibility: () => Promise<void>;
  yearOptions: string[];
  stageOptions: string[];
  gradeOptions: string[];
  groupOptions: string[];
  allowedYears: string[] | null;
  setAllowedYears: React.Dispatch<React.SetStateAction<string[] | null>>;
  allowedStages: string[] | null;
  setAllowedStages: React.Dispatch<React.SetStateAction<string[] | null>>;
  allowedGrades: string[] | null;
  setAllowedGrades: React.Dispatch<React.SetStateAction<string[] | null>>;
  allowedGroups: string[] | null;
  setAllowedGroups: React.Dispatch<React.SetStateAction<string[] | null>>;
  toggleAllowed: (
    value: string,
    current: string[] | null,
    options: string[],
    setter: React.Dispatch<React.SetStateAction<string[] | null>>,
  ) => void;
}

export function CertificateVisibilityPanel({
  visibilityPanelRef,
  visibilityDirty,
  savingYears,
  handleSaveVisibility,
  yearOptions,
  stageOptions,
  gradeOptions,
  groupOptions,
  allowedYears,
  setAllowedYears,
  allowedStages,
  setAllowedStages,
  allowedGrades,
  setAllowedGrades,
  allowedGroups,
  setAllowedGroups,
  toggleAllowed,
}: CertificateVisibilityPanelProps) {
  const sections = [
    {
      label: "السنوات",
      options: yearOptions,
      value: allowedYears,
      setter: setAllowedYears,
    },
    {
      label: "المراحل",
      options: stageOptions,
      value: allowedStages,
      setter: setAllowedStages,
    },
    {
      label: "الصفوف",
      options: gradeOptions,
      value: allowedGrades,
      setter: setAllowedGrades,
    },
    {
      label: "المجموعات",
      options: groupOptions,
      value: allowedGroups,
      setter: setAllowedGroups,
    },
  ];

  return (
    <div
      ref={visibilityPanelRef}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            إعدادات ظهور الشهادات على الموقع
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            اختر السنوات والمراحل والصفوف والمجموعات التي تظهر لزوار الموقع. غير
            المحدد يختفي تماماً من الموقع.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveVisibility}
          disabled={!visibilityDirty || savingYears}
          className="shrink-0"
        >
          {savingYears ? "جاري الحفظ..." : "حفظ الإعداد"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sections.map(({ label, options, value, setter }) => (
          <details key={label} className="relative group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300">
              <span>{label}</span>
              <span className="text-xs text-slate-400">
                {value === null ? "الكل" : `${value.length} محدد`}
              </span>
            </summary>
            <div className="absolute right-0 z-20 mt-1 max-h-64 w-full min-w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={value === null}
                  onChange={() => setter(null)}
                  className="h-4 w-4 accent-indigo-600"
                />
                الكل
              </label>
              {options.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-400">
                  لا توجد خيارات بعد
                </p>
              ) : (
                options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={(value ?? options).includes(option)}
                      onChange={() =>
                        toggleAllowed(option, value, options, setter)
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span>{option}</span>
                  </label>
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
