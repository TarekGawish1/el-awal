"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { isOptimizableImage } from "@/lib/utils/asset-url";
import { Plus, Award, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SavedCertificate } from "../hooks/useCertificatesClient";

interface CertificateGridProps {
  certificates: SavedCertificate[];
  filteredCertificates: SavedCertificate[];
  deletingId: string | null;
  togglingId: string | null;
  handleToggleVisibility: (cert: SavedCertificate) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function CertificateGrid({
  certificates,
  filteredCertificates,
  deletingId,
  togglingId,
  handleToggleVisibility,
  handleDelete,
}: CertificateGridProps) {
  if (certificates.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          لا توجد شهادات بعد
        </h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          قم بإنشاء شهادتك الأولى لتبدأ في تقدير طلابك المتميزين وتشجيعهم.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/teacher/certificates/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء شهادة جديدة
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (filteredCertificates.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          لا توجد نتائج مطابقة
        </h3>
        <p className="text-slate-500">جرب البحث بكلمات مختلفة.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Link href="/teacher/certificates/new">
        <Card className="h-full min-h-[300px] border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 group">
          <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-4 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">إنشاء شهادة جديدة</h3>
          <p className="text-sm mt-2 text-center px-4 opacity-70">
            اضغط هنا لتصميم وإصدار شهادة تقدير جديدة لطلابك
          </p>
        </Card>
      </Link>

      {filteredCertificates.map((cert) => {
        const certificateImage = cert.data?.image || (cert as any).image;
        const usesTemplateFallback = !certificateImage;
        const certificateData = cert.data || cert;
        const isFemale = certificateData.gender === "FEMALE";
        const teacherName = certificateData.teacherName || "أحمد غريب";
        const certificateYear = String(
          cert.year || cert.issueDate || new Date().getFullYear(),
        );
        const certificateDate = String(cert.issueDate || certificateYear);

        return (
          <Card
            key={cert.id}
            className={`overflow-hidden hover:shadow-md transition-shadow flex flex-col ${cert.isPublic === false ? "opacity-70" : ""}`}
          >
            {cert.isPublic === false && (
              <div className="bg-slate-800 text-white text-xs font-bold text-center py-1.5">
                مخفية من الموقع
              </div>
            )}
            <div className="relative w-full aspect-[1.41] bg-slate-100 border-b border-slate-100">
              {certificateImage ? (
                <Image
                  src={certificateImage}
                  alt={`شهادة ${cert.studentName}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized={!isOptimizableImage(certificateImage)}
                />
              ) : (
                <div
                  dir="rtl"
                  className="relative w-full h-full bg-center bg-no-repeat bg-cover overflow-hidden"
                  style={{
                    backgroundImage: "url('/certification-bg.webp')",
                    fontFamily: "'Amiri', 'Tajawal', serif",
                  }}
                >
                  <div className="absolute inset-x-0 top-[28.4%] flex flex-col items-center text-center px-[5%] leading-tight text-[#4A4A4A]">
                    <p className="text-[clamp(6px,1.9vw,15px)] font-bold">
                      يسر الأستاذ {teacherName} أن يمنح هذه الشهادة إلى{" "}
                      {isFemale ? "الطالبة" : "الطالب"}
                    </p>
                    <h2 className="mt-[2%] max-w-[80%] text-[clamp(12px,3.5vw,32px)] font-bold text-[#1D4ED8]">
                      {cert.studentName}
                    </h2>
                    <p className="mt-[2%] max-w-[76%] text-[clamp(6px,1.55vw,13px)] font-bold leading-[1.8]">
                      وذلك تقديرًا{" "}
                      {isFemale
                        ? "لأدائها المتميز وتفوقها"
                        : "لأدائه المتميز وتفوقه"}{" "}
                      العلمي الملحوظ في مادة
                      <span className="mx-1 text-[#1D4ED8]">
                        {cert.subject}
                      </span>
                      ، {isFemale ? "متمنيةً لها" : "متمنيًا له"} مستقبلًا
                      واعدًا ومزيدًا من النجاح والتألق.
                    </p>
                  </div>
                  <span className="absolute left-[50.2%] top-[78.5%] -translate-x-1/2 -translate-y-1/2 text-[clamp(9px,2.4vw,22px)] font-bold text-[#0A192F]">
                    {cert.score}
                  </span>
                  <span className="absolute left-[17.5%] top-[66.7%] -translate-x-1/2 -translate-y-1/2 text-[clamp(5px,1.25vw,12px)] font-bold text-[#0A192F]">
                    {certificateYear}
                  </span>
                  <span
                    className="absolute left-[33.9%] top-[76.5%] -translate-x-1/2 -translate-y-1/2 text-[clamp(5px,1vw,10px)] font-bold text-[#4A4A4A]"
                    dir="ltr"
                  >
                    {certificateDate}
                  </span>
                </div>
              )}
              {usesTemplateFallback && (
                <span className="sr-only">شهادة {cert.studentName}</span>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  {certificateYear}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {cert.studentName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 flex-wrap">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                  {cert.subject}
                </span>
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs">
                  {cert.score} درجة
                </span>
              </div>
              <div className="mt-auto flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-4">
                <span>
                  {cert.stage}
                  {cert.grade ? ` - ${cert.grade}` : ""}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleVisibility(cert)}
                    disabled={togglingId === cert.id}
                    title={
                      cert.isPublic === false
                        ? "إظهار على الموقع"
                        : "إخفاء من الموقع"
                    }
                    className={`font-medium hover:underline text-xs disabled:opacity-50 disabled:cursor-wait flex items-center gap-1 ${
                      cert.isPublic === false
                        ? "text-emerald-600 hover:text-emerald-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {cert.isPublic === false ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {togglingId === cert.id
                      ? "جاري..."
                      : cert.isPublic === false
                        ? "إظهار"
                        : "إخفاء"}
                  </button>
                  <button
                    onClick={() => handleDelete(cert.id)}
                    disabled={deletingId === cert.id}
                    className="text-red-500 hover:text-red-700 font-medium hover:underline text-xs disabled:opacity-50 disabled:cursor-wait"
                  >
                    {deletingId === cert.id ? "جاري الحذف..." : "حذف"}
                  </button>
                  {cert.data?.image || (cert as any).image ? (
                    <a
                      href={cert.data?.image || (cert as any).image}
                      download={`شهادة-${cert.studentName}.png`}
                      className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-xs"
                    >
                      تحميل
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
