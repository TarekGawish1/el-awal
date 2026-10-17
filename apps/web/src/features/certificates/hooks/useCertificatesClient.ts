"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { GRADE_LEVELS_BY_STAGE } from "@/lib/constants/grades";
import {
  SavedCertificate,
  normalizeCertificateGrade,
  isUuid,
  getCertificateIdentity,
  STAGE_OPTIONS,
  STAGE_FILTER_OPTIONS,
  mergeLocalAndApiCertificates,
} from "../utils/certificateClientUtils";
import { useCertificateVisibilitySettings } from "./useCertificateVisibilitySettings";

export {
  normalizeCertificateGrade,
  isUuid,
  getCertificateIdentity,
  STAGE_OPTIONS,
  STAGE_FILTER_OPTIONS,
};
export type { SavedCertificate };

export function useCertificatesClient() {
  const [certificates, setCertificates] = useState<SavedCertificate[]>([]);
  const visibilityPanelRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState("الكل");
  const [selectedYear, setSelectedYear] = useState("الكل");
  const [selectedGrade, setSelectedGrade] = useState("الكل");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
        const json = await apiClient<any>(API_ENDPOINTS.CERTIFICATES.LIST);
        apiCerts = json?.data || (Array.isArray(json) ? json : []);
      } catch (err) {
        try {
          const json = await apiClient<any>(API_ENDPOINTS.CERTIFICATES.PUBLIC);
          apiCerts = json?.data || (Array.isArray(json) ? json : []);
        } catch (pubErr) {
          console.error("Error fetching API certificates:", pubErr);
        }
      }

      const finalCertificates = mergeLocalAndApiCertificates(localCerts, apiCerts);
      setCertificates(finalCertificates);
    };

    fetchAndMergeCertificates();
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    certificates.forEach((c) => {
      const y = String((c as any).year || "").trim();
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
  }, [certificates]);

  const allGrades = useMemo(() => {
    const allCanonicalGrades = Object.values(GRADE_LEVELS_BY_STAGE).flat();
    const existingGrades = certificates
      .map((certificate) =>
        normalizeCertificateGrade(certificate.grade, certificate.stage),
      )
      .filter(Boolean);
    return Array.from(new Set([...allCanonicalGrades, ...existingGrades]));
  }, [certificates]);

  const {
    allowedYears,
    setAllowedYears,
    savedAllowedYears,
    savingYears,
    allowedStages,
    setAllowedStages,
    savedAllowedStages,
    allowedGrades,
    setAllowedGrades,
    savedAllowedGrades,
    allowedGroups,
    setAllowedGroups,
    savedAllowedGroups,
    gradeOptions,
    groupOptions,
    toggleAllowed,
    visibilityDirty,
    handleSaveVisibility,
  } = useCertificateVisibilitySettings({
    yearOptions,
    allGrades,
    certificates,
    visibilityPanelRef,
  });

  const grades = useMemo(() => {
    const stageGrades =
      selectedStage === "الكل"
        ? allGrades
        : allGrades.filter((grade) => {
            const stageSuffix = {
              الثانوية: "الثانوي",
              الإعدادية: "الإعدادي",
              الابتدائية: "الابتدائي",
            }[selectedStage];
            return stageSuffix ? grade.endsWith(stageSuffix) : true;
          });
    return ["الكل", ...stageGrades];
  }, [allGrades, selectedStage]);

  const years = useMemo(() => {
    const matchesCurrentFilters = certificates.filter((certificate) => {
      const matchesStage =
        selectedStage === "الكل" || certificate.stage === selectedStage;
      const matchesGrade =
        selectedGrade === "الكل" ||
        normalizeCertificateGrade(certificate.grade, certificate.stage) ===
          selectedGrade;
      return matchesStage && matchesGrade;
    });
    const sourceCertificates = matchesCurrentFilters.length
      ? matchesCurrentFilters
      : certificates;
    const set = new Set<string>();
    sourceCertificates.forEach((c) => {
      const y = String(c.year || "").trim();
      if (y) set.add(y);
    });
    return [
      "الكل",
      ...Array.from(set).sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true }),
      ),
    ];
  }, [certificates, selectedStage, selectedGrade]);

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
      if (isUuid(id)) {
        await apiClient(API_ENDPOINTS.CERTIFICATES.DELETE(id), {
          method: "DELETE",
        });
      }

      setCertificates((prev) => prev.filter((c) => c.id !== id));
      try {
        const local = JSON.parse(
          localStorage.getItem("saved_certificates") || "[]",
        );
        const filtered = local.filter((c: any) => c.id !== id);
        localStorage.setItem("saved_certificates", JSON.stringify(filtered));
      } catch (err) {
        console.warn("Could not remove certificate from localStorage", err);
      }

      toast.success("تم حذف الشهادة بنجاح");
    } catch (err: any) {
      console.error("Error deleting certificate:", err);
      toast.error(err?.message || "فشل حذف الشهادة");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublic = async (id: string, currentPublic: boolean) => {
    setTogglingId(id);
    const nextPublic = !currentPublic;

    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPublic: nextPublic } : c)),
    );

    try {
      const local = JSON.parse(
        localStorage.getItem("saved_certificates") || "[]",
      );
      const updated = local.map((c: any) =>
        c.id === id ? { ...c, isPublic: nextPublic } : c,
      );
      localStorage.setItem("saved_certificates", JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not update certificate in localStorage", err);
    }

    try {
      if (isUuid(id)) {
        await apiClient(`/certificates/${id}/toggle-public`, {
          method: "PATCH",
        });
      }
      toast.success(
        nextPublic ? "أصبحت الشهادة عامة للجميع" : "أصبحت الشهادة خاصة للمعلم فقط",
      );
    } catch (err: any) {
      console.error("Error toggling public state:", err);
      setCertificates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPublic: currentPublic } : c)),
      );
      try {
        const local = JSON.parse(
          localStorage.getItem("saved_certificates") || "[]",
        );
        const reverted = local.map((c: any) =>
          c.id === id ? { ...c, isPublic: currentPublic } : c,
        );
        localStorage.setItem("saved_certificates", JSON.stringify(reverted));
      } catch {}
      toast.error(err?.message || "فشل تعديل حالة ظهور الشهادة");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleVisibility = async (cert: SavedCertificate) => {
    return handleTogglePublic(cert.id, cert.isPublic);
  };

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const normalizedCertGrade = normalizeCertificateGrade(c.grade, c.stage);
      const matchesSearch =
        c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage =
        selectedStage === "الكل" || c.stage === selectedStage;
      const matchesYear = selectedYear === "الكل" || c.year === selectedYear;
      const matchesGrade =
        selectedGrade === "الكل" || normalizedCertGrade === selectedGrade;

      return matchesSearch && matchesStage && matchesYear && matchesGrade;
    });
  }, [certificates, searchTerm, selectedStage, selectedYear, selectedGrade]);

  const stats = useMemo(() => {
    const total = certificates.length;
    const publicCount = certificates.filter((c) => c.isPublic).length;
    const privateCount = total - publicCount;
    return { total, publicCount, privateCount };
  }, [certificates]);

  return {
    certificates,
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
    savedAllowedYears,
    savingYears,
    allowedStages,
    setAllowedStages,
    savedAllowedStages,
    allowedGrades,
    setAllowedGrades,
    savedAllowedGrades,
    allowedGroups,
    setAllowedGroups,
    savedAllowedGroups,
    yearOptions,
    stageOptions: STAGE_OPTIONS,
    gradeOptions,
    groupOptions,
    stages: STAGE_FILTER_OPTIONS,
    grades,
    years,
    toggleAllowed,
    visibilityDirty,
    handleSaveVisibility,
    handleDelete,
    handleTogglePublic,
    handleToggleVisibility,
    filteredCertificates,
    stats,
  };
}
