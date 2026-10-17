import { GRADE_LEVELS_BY_STAGE } from "@/lib/constants/grades";

export interface SavedCertificate {
  id: string;
  studentName: string;
  subject: string;
  score: string;
  stage: string;
  grade: string;
  issueDate: string;
  year: string;
  groupName?: string;
  isPublic: boolean;
  createdAt: string;
  gender?: string;
  teacherName?: string;
  image?: string;
  data?: any;
}

export const normalizeCertificateGrade = (grade: unknown, stage: unknown) => {
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
  return suffix && /^الصف (الأول|الثاني|الثالث|الرابع|الخامس|السادس)$/.test(value)
    ? `${value} ${suffix}`
    : value;
};

export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const getCertificateIdentity = (cert: any) => {
  const identityParts = [
    cert?.id ?? "",
    cert?.studentName ?? "",
    cert?.subject ?? "",
    cert?.stage ?? "",
    cert?.grade ?? "",
    cert?.year ?? "",
    cert?.issueDate ?? "",
    cert?.teacherName ?? "",
    cert?.score ?? "",
  ];
  return identityParts.map((part) => String(part).trim()).join("|");
};

export const STAGE_OPTIONS = ["الثانوية", "الإعدادية", "الابتدائية"];
export const STAGE_FILTER_OPTIONS = ["الكل", "الثانوية", "الإعدادية", "الابتدائية"];

export function mergeLocalAndApiCertificates(localCerts: any[], apiCerts: any[]): SavedCertificate[] {
  const mappedApiCerts = apiCerts.map((c: any) => {
    const localMatch = localCerts.find(
      (local: any) =>
        local.id === c.id ||
        (local.studentName === c.studentName &&
          local.subject === c.subject &&
          local.year === c.year),
    );
    const resolvedStage = String(c.stage || c.data?.stage || localMatch?.stage || "");
    const resolvedGrade = normalizeCertificateGrade(
      c.grade || c.data?.grade || localMatch?.grade || "",
      resolvedStage,
    );

    return {
      id: c.id,
      studentName: c.studentName || c.data?.studentName || localMatch?.studentName || "",
      subject: c.subject || c.data?.subject || localMatch?.subject || "",
      score: c.score || c.data?.score || localMatch?.score || "100",
      stage: resolvedStage,
      grade: resolvedGrade,
      issueDate: c.issueDate || c.data?.issueDate || localMatch?.issueDate || new Date().toISOString(),
      year: c.year || c.data?.year || localMatch?.year || new Date().getFullYear().toString(),
      groupName: c.groupName || c.group?.name || localMatch?.groupName,
      isPublic: c.isPublic !== undefined ? c.isPublic : localMatch ? localMatch.isPublic : true,
      createdAt: c.createdAt || localMatch?.createdAt || new Date().toISOString(),
      gender: c.gender || c.data?.gender || localMatch?.gender,
      teacherName: c.teacherName || c.data?.teacherName || localMatch?.teacherName,
      image: c.image || c.data?.image || localMatch?.image,
      data: c.data || localMatch?.data,
    };
  });

  const merged = [...localCerts];
  mappedApiCerts.forEach((apiCert: any) => {
    const exists = merged.some(
      (m) =>
        m.id === apiCert.id ||
        (m.studentName === apiCert.studentName &&
          m.subject === apiCert.subject &&
          m.year === apiCert.year),
    );
    if (!exists) {
      merged.push(apiCert);
    } else {
      const idx = merged.findIndex(
        (m) =>
          m.id === apiCert.id ||
          (m.studentName === apiCert.studentName &&
            m.subject === apiCert.subject &&
            m.year === apiCert.year),
      );
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...apiCert };
      }
    }
  });

  const uniqueByIdentity = new Map<string, SavedCertificate>();
  for (const cert of merged) {
    const identityKey = getCertificateIdentity(cert);
    const existing = uniqueByIdentity.get(identityKey);
    if (!existing) {
      uniqueByIdentity.set(identityKey, cert);
      continue;
    }
    const preferCandidate = isUuid(cert.id) && !isUuid(existing.id);
    if (preferCandidate) {
      uniqueByIdentity.set(identityKey, { ...existing, ...cert });
    }
  }

  const finalCertificates = Array.from(uniqueByIdentity.values());
  finalCertificates.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return finalCertificates;
}
