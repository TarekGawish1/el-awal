'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSiteSettings, usePublicCertificates } from '@/hooks/usePublicContent';
import { API_BASE_URL } from '@/lib/api/endpoints';
import {
  SEED_CERTIFICATES,
  CERTIFICATES_BY_STAGE,
  getCertificateIdentity,
  normalizeCertificateGrade,
} from './certificates-data';

export function useCertificatesSync() {
  const [stagesData, setStagesData] = useState(CERTIFICATES_BY_STAGE);
  const { data: siteSettings } = useSiteSettings();
  const { data: publicCerts = [] } = usePublicCertificates();

  // Owner control: academic years allowed on the landing page (null = all).
  const allowedYears = useMemo(() => {
    const raw = siteSettings?.certificatesVisibleYears;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedStages = useMemo(() => {
    const raw = siteSettings?.certificatesVisibleStages;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedGrades = useMemo(() => {
    const raw = siteSettings?.certificatesVisibleGrades;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedGroups = useMemo(() => {
    const raw = siteSettings?.certificatesVisibleGroups;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const visibleStages = stagesData
    .map((stage) => ({
      ...stage,
      certificates: (stage.certificates || []).filter(
        (c: any) =>
          (!allowedYears ||
            allowedYears.includes(String(c.year || "").trim()) ||
            !String(c.year || "").trim()) &&
          (!allowedStages ||
            allowedStages.includes(String(c.stage || "").trim()) ||
            !String(c.stage || "").trim()) &&
          (!allowedGrades ||
            allowedGrades.includes(
              normalizeCertificateGrade(c.classGrade, c.stage),
            ) ||
            !String(c.classGrade || "").trim()) &&
          (!allowedGroups ||
            allowedGroups.includes(String(c.groupName || "").trim()) ||
            !String(c.groupName || "").trim()),
      ),
    }))
    .filter((stage) => stage.certificates && stage.certificates.length > 0);

  useEffect(() => {
    const syncAndFetchCertificates = async () => {
      try {
        const baseUrl = API_BASE_URL;

        // 1. Get local storage certificates
        let localCerts: any[] = [];
        try {
          localCerts = JSON.parse(
            localStorage.getItem("saved_certificates") || "[]",
          );
        } catch (localError) {
          console.warn("Could not parse local certificates", localError);
        }

        // 2. Sync unsynced local certificates to backend
        const syncedFlags = JSON.parse(
          localStorage.getItem("synced_certificates") || "{}",
        );
        let needsRefetch = false;

        for (const cert of localCerts) {
          if (!syncedFlags[cert.id]) {
            try {
              const formData = new FormData();
              formData.append("studentName", cert.studentName || "طالب");
              formData.append("subject", cert.subject || "عام");
              formData.append("score", cert.score || "100");
              formData.append("issueDate", cert.issueDate || "");
              formData.append("year", cert.year || "");
              formData.append(
                "stage",
                cert.stage || (cert.data && cert.data.stage) || "",
              );
              formData.append(
                "grade",
                cert.grade || (cert.data && cert.data.grade) || "",
              );
              formData.append(
                "groupName",
                cert.groupName || (cert.data && cert.data.groupName) || "",
              );
              formData.append("fileUrl", cert.image);

              const uploadRes = await fetch(`${baseUrl}/certificates`, {
                method: "POST",
                body: formData,
              });

              if (uploadRes.ok) {
                syncedFlags[cert.id] = true;
                needsRefetch = true;
              }
            } catch (err) {
              console.error("Failed to sync cert", err);
            }
          }
        }

        if (needsRefetch) {
          localStorage.setItem(
            "synced_certificates",
            JSON.stringify(syncedFlags),
          );
        }

        // 3. Use certificates from TanStack Query hook
        let apiCerts = Array.isArray(publicCerts) ? publicCerts : [];

        if (!Array.isArray(apiCerts)) apiCerts = [];
        if (!Array.isArray(localCerts)) localCerts = [];

        // Merge backend certs with local certs (fallback)
        const mappedApiCerts = apiCerts.map((c: any) => ({
          id: c.id,
          title: c.subject ? `التفوق في ${c.subject}` : "شهادة تقدير",
          subject: c.subject,
          student: c.studentName || "طالب",
          grade: c.score,
          classGrade: c.grade || "",
          year: c.year,
          image: c.fileUrl || "/certification-bg.webp",
          stage: c.stage,
          groupName: c.groupName || "",
          isPublic: c.isPublic !== false,
        }));

        const mappedLocalCerts = localCerts.map((c: any) => ({
          id: c.id,
          title: c.subject ? `التفوق في ${c.subject}` : "شهادة تقدير",
          student: c.studentName || "طالب",
          grade: c.score,
          classGrade: c.grade || (c.data && c.data.grade) || "",
          year: c.year || (c.data && c.data.year) || "",
          image: c.image || "/certification-bg.webp",
          stage: c.stage || (c.data && c.data.stage),
          groupName: c.groupName || (c.data && c.data.groupName) || "",
          isPublic: c.isPublic !== false,
        }));

        const combined = [
          ...mappedApiCerts,
          ...mappedLocalCerts,
          ...SEED_CERTIFICATES,
        ];
        const visibleOnly = combined.filter((item) => item.isPublic !== false);
        const uniqueSaved = Array.from(
          new Map(
            visibleOnly.map((item) => [getCertificateIdentity(item), item]),
          ).values(),
        );

        if (uniqueSaved.length > 0) {
          const newSecondary = uniqueSaved.filter(
            (c: any) => c.stage === "الثانوية",
          );
          const newPreparatory = uniqueSaved.filter(
            (c: any) => c.stage === "الإعدادية",
          );
          const newPrimary = uniqueSaved.filter(
            (c: any) => c.stage === "الابتدائية",
          );
          const newOther = uniqueSaved.filter(
            (c: any) =>
              !["الثانوية", "الإعدادية", "الابتدائية"].includes(c.stage),
          );

          const nextStages = CERTIFICATES_BY_STAGE.map((stage) => {
            if (stage.stageId === "secondary" && newSecondary.length > 0) {
              return { ...stage, certificates: newSecondary };
            }
            if (stage.stageId === "preparatory" && newPreparatory.length > 0) {
              return { ...stage, certificates: newPreparatory };
            }
            if (stage.stageId === "primary" && newPrimary.length > 0) {
              return { ...stage, certificates: newPrimary };
            }
            return stage;
          });

          if (newOther.length > 0) {
            nextStages.push({
              stageId: "other",
              stageName: "شهادات أخرى",
              certificates: newOther,
            });
          }

          setStagesData(nextStages);
        } else {
          setStagesData(CERTIFICATES_BY_STAGE);
        }
      } catch (e) {
        console.error("Failed to sync/fetch certificates:", e);
      }
    };

    syncAndFetchCertificates();
  }, [publicCerts]);

  return { visibleStages };
}
