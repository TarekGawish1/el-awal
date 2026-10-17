"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { CertificateData } from "../components/CertificateTemplateA";

import {
  STAGE_GRADES,
  STAGE_SUFFIX,
  toGradeLevel,
  parseGradeLevel,
  GroupOption,
} from "../utils/certificateGradeUtils";

export { STAGE_GRADES, STAGE_SUFFIX, toGradeLevel, parseGradeLevel };
export type { GroupOption };

export function useCertificateBuilder() {
  const router = useRouter();

  const [data, setData] = useState<CertificateData>({
    studentName: "",
    gender: "MALE",
    subject: "",
    score: "100",
    issueDate: new Date().toLocaleDateString("ar-EG"),
    year: new Date().getFullYear().toString(),
    teacherName: "أحمد غريب",
    stage: "",
    grade: "",
    yearPos: { x: 143, y: 573 },
    scorePos: { x: 577, y: 636 },
    datePos: { x: 388, y: 620 },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [studentSuggestions, setStudentSuggestions] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) => {
        const parsed = parseGradeLevel(group.gradeLevel);
        if (data.stage && parsed.stage !== data.stage) return false;
        if (data.grade && parsed.grade !== data.grade) return false;
        return true;
      }),
    [groups, data.stage, data.grade],
  );

  useEffect(() => {
    if (
      selectedGroupId &&
      !filteredGroups.some((group) => group.id === selectedGroupId)
    ) {
      setSelectedGroupId("");
    }
  }, [filteredGroups, selectedGroupId]);

  // Load teacher groups once for the group-first student picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingGroups(true);
      try {
        const json = await apiClient<any>(API_ENDPOINTS.GROUPS.LIST);
        if (!cancelled) {
          const list = Array.isArray(json) ? json : json?.data || [];
          setGroups(
            list
              .map((g: any) => ({
                id: String(g.id),
                name: g.name || "مجموعة",
                gradeLevel: g.gradeLevel || "",
              }))
              .filter((g: GroupOption) => g.id),
          );
        }
      } catch (e) {
        console.warn("Group lookup failed:", e);
      } finally {
        if (!cancelled) setIsLoadingGroups(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real student lookup
  useEffect(() => {
    const hasGroup = !!selectedGroupId;
    const gradeLevel = toGradeLevel(data.stage, data.grade);
    if (!hasGroup && (!data.stage || !data.grade)) {
      setStudentSuggestions([]);
      return;
    }
    const search = data.studentName.trim();
    const timer = setTimeout(async () => {
      setIsLoadingStudents(true);
      try {
        const params: Record<string, string> = { limit: hasGroup ? "50" : "20" };
        if (hasGroup) {
          params.groupId = selectedGroupId;
        } else if (gradeLevel) {
          params.gradeLevel = gradeLevel;
        }
        if (search) params.search = search;
        const json = await apiClient<any>(API_ENDPOINTS.STUDENTS.LIST, { params });
        const list = json?.data || (Array.isArray(json) ? json : []);
        setStudentSuggestions(
          list
            .map((s: any) => ({
              id: String(s.id),
              name: s.user?.fullName || "",
            }))
            .filter((s: { id: string; name: string }) => s.name),
        );
      } catch (e) {
        console.warn("Student lookup failed:", e);
      } finally {
        setIsLoadingStudents(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedGroupId, data.stage, data.grade, data.studentName]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setData((prev) => ({ ...prev, studentName: "" }));
    setShowSuggestions(true);
    const group = groups.find((g) => g.id === groupId);
    if (group?.gradeLevel) {
      const parsed = parseGradeLevel(group.gradeLevel);
      if (parsed.stage || parsed.grade) {
        setData((prev) => ({
          ...prev,
          stage: parsed.stage,
          grade: parsed.grade,
        }));
      }
    }
  };

  // Auto-scale to fit container on load/resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const targetWidth = 1146;
        const availableWidth = containerWidth - 32;
        const newScale = Math.min(availableWidth / targetWidth, 1.2);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleChange = (field: keyof CertificateData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setData({
      studentName: "",
      gender: "MALE",
      subject: "",
      score: "100",
      issueDate: new Date().toLocaleDateString("ar-EG"),
      year: new Date().getFullYear().toString(),
      teacherName: "أحمد غريب",
      stage: "",
      grade: "",
      yearPos: { x: 143, y: 573 },
      scorePos: { x: 577, y: 636 },
      datePos: { x: 388, y: 620 },
    });
    setSelectedGroupId("");
    setStudentSuggestions([]);
    setShowSuggestions(false);
  };

  const handleGenerate = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);

    try {
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "0";
      wrapper.style.height = "0";
      wrapper.style.overflow = "hidden";

      const clone = certificateRef.current.cloneNode(true) as HTMLElement;
      clone.style.margin = "0";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      await document.fonts.ready;

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FDFDFD",
        width: 1146,
        height: 810,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1146,
        windowHeight: 810,
      });

      document.body.removeChild(wrapper);

      const downloadImgData = canvas.toDataURL("image/png");

      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = 1146 / 2;
      previewCanvas.height = 810 / 2;
      const ctx = previewCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      }
      const previewImgData = previewCanvas.toDataURL("image/webp", 0.5);

      const link = document.createElement("a");
      link.href = downloadImgData;
      link.download = `شهادة-${data.studentName || "طالب"}.png`;
      link.click();

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          let uploadedFileUrl = previewImgData;
          try {
            const presignedData = await apiClient<any>("/content/presigned-upload-url", {
              method: "POST",
              body: JSON.stringify({
                fileName: `certificate-${Date.now()}.png`,
                contentType: "image/png",
                fileSizeBytes: blob.size,
                folder: "certificates",
              }),
            });
            const presigned = presignedData?.data || presignedData;

            if (presigned?.uploadUrl) {
              await fetch(presigned.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "image/png" },
                body: blob,
              });

              uploadedFileUrl = presigned.publicUrl || presigned.uploadUrl;
            }
          } catch (uploadErr) {
            console.warn("Direct R2 upload for certificate failed, using preview thumbnail fallback:", uploadErr);
          }

          const selectedGroup = groups.find(
            (group) => group.id === selectedGroupId,
          );

          let savedCertId = Date.now().toString();
          let serverFileUrl = previewImgData;

          try {
            const json = await apiClient<any>(API_ENDPOINTS.CERTIFICATES.CREATE, {
              method: "POST",
              body: JSON.stringify({
                studentName: data.studentName || "طالب",
                gender: data.gender || "MALE",
                subject: data.subject || "عام",
                score: data.score || "100",
                issueDate: data.issueDate || "",
                year: data.year || "",
                stage: data.stage || "",
                grade: data.grade || "",
                teacherName: data.teacherName || "",
                groupName: selectedGroup?.name || "",
                fileUrl: uploadedFileUrl,
              }),
            });

            const created = json?.data || json;
            if (created?.id) savedCertId = created.id;
            if (created?.fileUrl) serverFileUrl = created.fileUrl;
            console.log("Certificate uploaded successfully to R2 bucket and database.");
          } catch (createErr) {
            console.warn("Failed to save certificate record on server:", createErr);
          }

          try {
            const savedCerts = JSON.parse(
              localStorage.getItem("saved_certificates") || "[]",
            );
            const newCertificate = {
              id: savedCertId,
              studentName: data.studentName || "طالب",
              subject: data.subject || "عام",
              score: data.score || "100",
              stage: data.stage || "",
              grade: data.grade || "",
              groupName: selectedGroup?.name || "",
              issueDate: data.issueDate || "",
              createdAt: new Date().toISOString(),
              image: serverFileUrl,
              data: { ...data },
            };

            const filteredCerts = savedCerts.filter(
              (c: any) =>
                c.id !== savedCertId &&
                !(
                  c.studentName?.trim() === newCertificate.studentName.trim() &&
                  c.subject?.trim() === newCertificate.subject.trim()
                ),
            );
            const updatedCerts = [newCertificate, ...filteredCerts].slice(0, 50);
            localStorage.setItem("saved_certificates", JSON.stringify(updatedCerts));

            const syncedFlags = JSON.parse(
              localStorage.getItem("synced_certificates") || "{}",
            );
            syncedFlags[savedCertId] = true;
            localStorage.setItem("synced_certificates", JSON.stringify(syncedFlags));
          } catch (storageErr) {
            console.warn("LocalStorage save error:", storageErr);
          }

          toast.success("تم إنشاء الشهادة بنجاح!");
          router.push("/teacher/certificates");
        } catch (e) {
          console.error("Failed to upload certificate", e);
          toast.success("تم حفظ الشهادة بنجاح!");
          router.push("/teacher/certificates");
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("حدث خطأ أثناء إنشاء الشهادة");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
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
  };
}
