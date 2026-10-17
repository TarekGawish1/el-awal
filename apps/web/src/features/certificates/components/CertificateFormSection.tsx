"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { CertificateData } from "./CertificateTemplateA";
import {
  STAGE_GRADES,
  GroupOption,
} from "../hooks/useCertificateBuilder";
import { CertificatePositionsForm } from "./CertificatePositionsForm";

interface CertificateFormSectionProps {
  data: CertificateData;
  setData: React.Dispatch<React.SetStateAction<CertificateData>>;
  isGenerating: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  studentSuggestions: { id: string; name: string }[];
  isLoadingStudents: boolean;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  isLoadingGroups: boolean;
  filteredGroups: GroupOption[];
  handleGroupChange: (groupId: string) => void;
  handleChange: (field: keyof CertificateData, value: any) => void;
  handleReset: () => void;
  handleGenerate: () => void;
}

export function CertificateFormSection({
  data,
  setData,
  isGenerating,
  showSuggestions,
  setShowSuggestions,
  studentSuggestions,
  isLoadingStudents,
  selectedGroupId,
  setSelectedGroupId,
  isLoadingGroups,
  filteredGroups,
  handleGroupChange,
  handleChange,
  handleReset,
  handleGenerate,
}: CertificateFormSectionProps) {
  const canPickStudent = !!selectedGroupId || (!!data.stage && !!data.grade);
  const typedName = data.studentName.trim();
  const exactMatch =
    Boolean(typedName && studentSuggestions.some((s) => s.name.trim() === typedName));

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">بيانات الشهادة</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة تعيين
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              المرحلة الدراسية
            </label>
            <Select
              value={data.stage}
              onChange={(e) => {
                setSelectedGroupId("");
                handleChange("stage", e.target.value);
                handleChange("grade", "");
              }}
              options={[
                { label: "اختر المرحلة...", value: "" },
                { label: "الابتدائية", value: "الابتدائية" },
                { label: "الإعدادية", value: "الإعدادية" },
                { label: "الثانوية", value: "الثانوية" },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الصف الدراسي
            </label>
            <Select
              value={data.grade}
              onChange={(e) => {
                setSelectedGroupId("");
                handleChange("grade", e.target.value);
              }}
              options={[
                { label: "اختر الصف...", value: "" },
                ...(data.stage &&
                STAGE_GRADES[data.stage as keyof typeof STAGE_GRADES]
                  ? STAGE_GRADES[data.stage as keyof typeof STAGE_GRADES]
                  : []),
              ]}
              disabled={!data.stage}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            المجموعة
          </label>
          <Select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            options={[
              {
                label: isLoadingGroups
                  ? "جاري تحميل المجموعات..."
                  : !data.stage || !data.grade
                    ? "اختر المرحلة والصف أولاً"
                    : filteredGroups.length === 0
                      ? "لا توجد مجموعات لهذا الصف"
                      : "اختر المجموعة...",
                value: "",
              },
              ...filteredGroups.map((g) => ({
                label: g.gradeLevel ? `${g.name} - ${g.gradeLevel}` : g.name,
                value: g.id,
              })),
            ]}
            disabled={isLoadingGroups || !data.stage || !data.grade}
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            اسم الطالب
          </label>
          <Input
            value={data.studentName}
            onChange={(e) => {
              handleChange("studentName", e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={
              !canPickStudent
                ? "اختر المجموعة أولاً..."
                : "ابحث بكتابة الاسم أو اختر من القائمة..."
            }
            disabled={!canPickStudent}
          />
          {!canPickStudent ? null : showSuggestions && (
            <div className="absolute top-[100%] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
              {isLoadingStudents && studentSuggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">
                  جاري البحث عن طلاب المجموعة...
                </div>
              ) : (
                <>
                  {studentSuggestions.length === 0 && !typedName ? (
                    <div className="px-4 py-3 text-sm text-slate-400">
                      لا يوجد طلاب في هذه المجموعة — اكتب الاسم لإضافته يدوياً.
                    </div>
                  ) : (
                    studentSuggestions.map((student) => (
                      <div
                        key={student.id}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChange("studentName", student.name);
                          setShowSuggestions(false);
                        }}
                      >
                        {student.name}
                      </div>
                    ))
                  )}
                  {typedName && !exactMatch ? (
                    <div
                      className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-sm text-indigo-700 font-medium border-t border-slate-100 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleChange("studentName", typedName);
                        setShowSuggestions(false);
                      }}
                    >
                      استخدام &quot;{typedName}&quot; (طالب جديد)
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
          {typedName && !exactMatch ? (
            <p className="mt-1 text-xs text-slate-400">
              سيُحفظ &quot;{typedName}&quot; كاسم جديد غير مسجل بالنظام.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            النوع
          </label>
          <Select
            value={data.gender}
            onChange={(e) => handleChange("gender", e.target.value as any)}
            options={[
              { label: "ذكر (الطالب / أدائه)", value: "MALE" },
              { label: "أنثى (الطالبة / أدائها)", value: "FEMALE" },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            المادة
          </label>
          <Select
            value={data.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            options={[
              { label: "اختر المادة...", value: "" },
              { label: "الإحصاء", value: "الإحصاء" },
              { label: "الرياضيات", value: "الرياضيات" },
              { label: "الفيزياء", value: "الفيزياء" },
              { label: "الكيمياء", value: "الكيمياء" },
              { label: "الأحياء", value: "الأحياء" },
              { label: "اللغة العربية", value: "اللغة العربية" },
              { label: "اللغة الإنجليزية", value: "اللغة الإنجليزية" },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            الدرجة
          </label>
          <Input
            value={data.score}
            onChange={(e) => handleChange("score", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            اسم المعلم المانح
          </label>
          <Input
            value={data.teacherName}
            onChange={(e) => handleChange("teacherName", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              التاريخ
            </label>
            <Input
              value={data.issueDate}
              onChange={(e) => handleChange("issueDate", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              السنة
            </label>
            <Input
              value={data.year}
              onChange={(e) => handleChange("year", e.target.value)}
            />
          </div>
        </div>

        <CertificatePositionsForm data={data} setData={setData} />

        <div className="pt-6 mt-4 border-t border-slate-100">
          <Button
            className="w-full py-6 text-lg bg-indigo-500 hover:bg-indigo-600 shadow-md"
            onClick={handleGenerate}
            disabled={isGenerating || !data.studentName || !data.subject}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 ml-2" />
            )}
            إنشاء وتحميل الصورة
          </Button>
        </div>
      </div>
    </Card>
  );
}
