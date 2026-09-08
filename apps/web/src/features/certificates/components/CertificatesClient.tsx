"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Award, Search, FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/client";
import { GRADE_LEVELS_BY_STAGE } from "@/lib/constants/grades";

interface SavedCertificate {
  id: string;
  studentName: string;
  subject: string;
  score: string;
  stage: string;
  grade: string;
  issueDate: string;
  year: string;
  isPublic: boolean;
  createdAt: string;
  data?: any;
}

export function CertificatesClient() {
  const [certificates, setCertificates] = useState<SavedCertificate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState("الكل");
  const [selectedYear, setSelectedYear] = useState("الكل");
  const [selectedGrade, setSelectedGrade] = useState("الكل");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [allowedYears, setAllowedYears] = useState<string[] | null>(null);
  const [savedAllowedYears, setSavedAllowedYears] = useState<string[] | null>(
    null,
  );
  const [savingYears, setSavingYears] = useState(false);

  const normalizeCertificateGrade = (grade: unknown, stage: unknown) => {
    const value = String(grade || "").trim();
    if (!value) return "";
    if (
      Object.values(GRADE_LEVELS_BY_STAGE).some((gradeList) =>
        gradeList.includes(value),
      )
    ) {
      return value;
    }

    const suffixByStage: Record<string, string> = {
      الثانوية: "الثانوي",
      الإعدادية: "الإعدادي",
      الابتدائية: "الابتدائي",
    };
    const suffix = suffixByStage[String(stage || "").trim()];
    return suffix &&
      /^الصف (الأول|الثاني|الثالث|الرابع|الخامس|السادس)$/.test(value)
      ? `${value} ${suffix}`
      : value;
  };

  const isUuid = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  useEffect(() => {
    const fetchAndMergeCertificates = async () => {
      let localCerts: any[] = [];
      try {
        const raw = JSON.parse(
          localStorage.getItem("saved_certificates") || "[]",
        );
        localCerts = (Array.isArray(raw) ? raw : []).map((c: any) => ({
          isPublic: true,
          ...c,
        }));
      } catch (err) {
        console.error("Error parsing certificates from localStorage:", err);
      }

      let apiCerts: any[] = [];
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
        const res = await fetch(`${baseUrl}/certificates/public`);
        if (res.ok) {
          const json = await res.json();
          apiCerts = json?.data || json || [];
        }
      } catch (err) {
        console.error("Error fetching API certificates:", err);
      }

      const mappedApiCerts = apiCerts.map((c: any) => {
        const localMatch = localCerts.find(
          (local: any) =>
            local.id === c.id ||
            (local.studentName?.trim() === c.studentName?.trim() &&
              local.subject?.trim() === c.subject?.trim()),
        );
        const localImage = localMatch?.image || localMatch?.data?.image;

        return {
          id: c.id,
          studentName: c.studentName,
          subject: c.subject,
          score: c.score,
          stage: c.stage,
          grade: c.grade,
          issueDate: c.issueDate,
          year: c.year,
          gender: c.gender,
          teacherName: c.teacherName,
          isPublic: c.isPublic !== false,
          createdAt: c.createdAt,
          image: c.fileUrl || c.image || localImage,
          data: localMatch?.data,
        };
      });

      // Filter out local certificates that are already present in the API
      const nonDuplicateLocalCerts = localCerts.filter((local: any) => {
        return !mappedApiCerts.some(
          (api: any) =>
            api.id === local.id ||
            (api.studentName?.trim() === local.studentName?.trim() &&
              api.subject?.trim() === local.subject?.trim()),
        );
      });

      // Keep localStorage clean of redundant duplicates
      if (nonDuplicateLocalCerts.length !== localCerts.length) {
        try {
          localStorage.setItem(
            "saved_certificates",
            JSON.stringify(nonDuplicateLocalCerts),
          );
        } catch (e) {
          console.warn("Could not update localStorage", e);
        }
      }

      const combined = [...mappedApiCerts, ...nonDuplicateLocalCerts];

      // Deduplicate by studentName + subject + stage to guarantee single appearance
      const seen = new Set<string>();
      const uniqueSaved: any[] = [];
      for (const item of combined) {
        const key = `${item.studentName?.trim()}_${item.subject?.trim()}_${item.stage?.trim()}`;
        if (!seen.has(key) && !seen.has(item.id)) {
          seen.add(key);
          seen.add(item.id);
          uniqueSaved.push(item);
        }
      }

      // Sort by creation date (newest first)
      uniqueSaved.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setCertificates(uniqueSaved as SavedCertificate[]);
    };

    fetchAndMergeCertificates();
  }, []);

  // Owner control: which academic years visitors see on the landing page
  useEffect(() => {
    (async () => {
      try {
        const json = await apiClient<any>("/site-settings");
        const arr = json?.settings || json?.data?.settings || [];
        const found = arr.find(
          (s: any) => s.key === "certificates.visibleYears",
        );
        const val = Array.isArray(found?.value)
          ? found.value.map((v: any) => String(v))
          : null;
        setAllowedYears(val);
        setSavedAllowedYears(val);
      } catch (err) {
        console.warn("Could not load site settings:", err);
      }
    })();
  }, []);

  const yearOptions = React.useMemo(() => {
    const set = new Set<string>();
    certificates.forEach((c) => {
      const y = String((c as any).year || "").trim();
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
  }, [certificates]);

  const toggleAllowedYear = (year: string) => {
    const base = allowedYears ?? yearOptions;
    setAllowedYears(
      base.includes(year) ? base.filter((y) => y !== year) : [...base, year],
    );
  };

  const yearsDirty =
    JSON.stringify([...(allowedYears ?? [])].sort()) !==
    JSON.stringify([...(savedAllowedYears ?? [])].sort());

  const handleSaveYears = async () => {
    setSavingYears(true);
    try {
      const value = allowedYears ?? yearOptions;
      await apiClient("/site-settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "certificates.visibleYears", value }),
      });
      setSavedAllowedYears(value);
      toast.success("تم حفظ سنوات العرض على الموقع");
    } catch (err: any) {
      console.error("Failed to save visible years:", err);
      toast.error(err?.message || "فشل حفظ الإعداد");
    } finally {
      setSavingYears(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذه الشهادة؟ سيتم حذفها من قاعدة البيانات والتخزين السحابي نهائياً.",
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      // 1. Delete from backend DB + Cloudflare R2 (apiClient attaches the JWT automatically).
      // Local-only certs (non-UUID ids) were never persisted, so skip the API call for them.
      if (isUuid(id)) {
        try {
          await apiClient(`/certificates/${id}`, { method: "DELETE" });
        } catch (err: any) {
          // 404 = already deleted in DB → treat as success and continue cleaning local state
          const msg = err?.message || "";
          const status = err?.statusCode;
          if (
            status !== 404 &&
            !msg.includes("غير موجودة") &&
            !msg.includes("404")
          ) {
            throw err;
          }
        }
      }

      // 2. Remove ONLY the localStorage copy (never write combined API certs back to localStorage)
      try {
        const localCerts = JSON.parse(
          localStorage.getItem("saved_certificates") || "[]",
        );
        const filteredLocal = Array.isArray(localCerts)
          ? localCerts.filter((c: any) => c.id !== id)
          : [];
        localStorage.setItem(
          "saved_certificates",
          JSON.stringify(filteredLocal),
        );
      } catch (e) {
        console.warn("Could not update localStorage", e);
      }

      // 3. Update UI state
      setCertificates((prev) => prev.filter((cert) => cert.id !== id));
      toast.success("تم حذف الشهادة بنجاح");
    } catch (err: any) {
      console.error("Failed to delete certificate from backend:", err);
      toast.error(err?.message || "فشل حذف الشهادة، يرجى المحاولة مرة أخرى");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (cert: SavedCertificate) => {
    const next = !cert.isPublic;
    setTogglingId(cert.id);
    try {
      if (isUuid(cert.id)) {
        await apiClient(`/certificates/${cert.id}/visibility`, {
          method: "PATCH",
          body: JSON.stringify({ isPublic: next }),
        });
      }
      // Local-only certs (or as a mirror): persist the flag in localStorage
      try {
        const localCerts = JSON.parse(
          localStorage.getItem("saved_certificates") || "[]",
        );
        if (
          Array.isArray(localCerts) &&
          localCerts.some((c: any) => c.id === cert.id)
        ) {
          localStorage.setItem(
            "saved_certificates",
            JSON.stringify(
              localCerts.map((c: any) =>
                c.id === cert.id ? { ...c, isPublic: next } : c,
              ),
            ),
          );
        }
      } catch (e) {
        console.warn("Could not update localStorage", e);
      }
      setCertificates((prev) =>
        prev.map((c) => (c.id === cert.id ? { ...c, isPublic: next } : c)),
      );
      toast.success(
        next ? "تم إظهار الشهادة على الموقع" : "تم إخفاء الشهادة من الموقع",
      );
    } catch (err: any) {
      console.error("Failed to toggle certificate visibility:", err);
      toast.error(err?.message || "فشل تغيير حالة الظهور");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.studentName?.includes(searchTerm) ||
      cert.subject?.includes(searchTerm);
    const matchesStage =
      selectedStage === "الكل" || cert.stage === selectedStage;
    const matchesYear =
      selectedYear === "الكل" ||
      String(cert.year || "").trim() === selectedYear;
    const matchesGrade =
      selectedGrade === "الكل" ||
      normalizeCertificateGrade(cert.grade, cert.stage) === selectedGrade;
    return matchesSearch && matchesStage && matchesYear && matchesGrade;
  });

  const stages = ["الكل", "الثانوية", "الإعدادية", "الابتدائية"];

  const grades = React.useMemo(() => {
    const allGrades = Object.values(GRADE_LEVELS_BY_STAGE).flat();
    const existingGrades = certificates
      .map((certificate) =>
        normalizeCertificateGrade(certificate.grade, certificate.stage),
      )
      .filter(Boolean);
    return ["الكل", ...Array.from(new Set([...allGrades, ...existingGrades]))];
  }, [certificates]);

  const years = React.useMemo(() => {
    const set = new Set<string>();
    certificates.forEach((c) => {
      const y = String(c.year || "").trim();
      if (y) set.add(y);
    });
    return [
      "الكل",
      ...Array.from(set).sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true }),
      ),
    ];
  }, [certificates]);

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

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              سنوات الظهور على الموقع
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              اختر السنوات الدراسية التي تظهر لزوار الموقع في لوحة الشرف. غير
              المحدد يختفي تماماً من الموقع.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleSaveYears}
            disabled={!yearsDirty || savingYears || yearOptions.length === 0}
            className="shrink-0"
          >
            {savingYears ? "جاري الحفظ..." : "حفظ الإعداد"}
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto mt-3 pb-1 hide-scrollbar">
          <button
            onClick={() => setAllowedYears(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              allowedYears === null
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            الكل
          </button>
          {yearOptions.map((year) => {
            const active = (allowedYears ?? yearOptions).includes(year);
            return (
              <button
                key={year}
                onClick={() => toggleAllowedYear(year)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 line-through"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="certificate-stage"
              className="text-xs font-bold text-slate-400"
            >
              المرحلة الدراسية:
            </label>
            <select
              id="certificate-stage"
              value={selectedStage}
              onChange={(event) => setSelectedStage(event.target.value)}
              className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage === "الكل" ? "كل المراحل" : stage}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="certificate-year"
              className="text-xs font-bold text-slate-400"
            >
              السنة الدراسية:
            </label>
            <select
              id="certificate-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year === "الكل" ? "كل السنوات" : year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="certificate-grade"
              className="text-xs font-bold text-slate-400"
            >
              الصف الدراسي:
            </label>
            <select
              id="certificate-grade"
              value={selectedGrade}
              onChange={(event) => setSelectedGrade(event.target.value)}
              className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === "الكل" ? "كل الصفوف" : grade}
                </option>
              ))}
            </select>
          </div>
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              className="pr-10"
              placeholder="ابحث عن اسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {certificates.length === 0 ? (
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
      ) : filteredCertificates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            لا توجد نتائج مطابقة
          </h3>
          <p className="text-slate-500">جرب البحث بكلمات مختلفة.</p>
        </div>
      ) : (
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
                    <img
                      src={certificateImage}
                      alt={`شهادة ${cert.studentName}`}
                      className="w-full h-full object-cover"
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
                          ، متمنيًا له مستقبلًا واعدًا ومزيدًا من النجاح
                          والتألق.
                        </p>
                      </div>
                      <span className="absolute left-[50.2%] top-[78.5%] -translate-x-1/2 -translate-y-1/2 text-[clamp(9px,2.4vw,22px)] font-bold text-[#0A192F]">
                        {cert.score}
                      </span>
                      <span className="absolute left-[17.5%] top-[66.7%] -translate-x-1/2 -translate-y-1/2 text-[clamp(5px,1.25vw,12px)] font-bold text-[#0A192F]">
                        {cert.year}
                      </span>
                      <span
                        className="absolute left-[33.9%] top-[76.5%] -translate-x-1/2 -translate-y-1/2 text-[clamp(5px,1vw,10px)] font-bold text-[#4A4A4A]"
                        dir="ltr"
                      >
                        {cert.issueDate}
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
                      {cert.year || cert.issueDate}
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
      )}
    </div>
  );
}
