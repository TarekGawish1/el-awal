export const STAGE_GRADES = {
  الابتدائية: [
    { label: "الصف الأول", value: "الصف الأول" },
    { label: "الصف الثاني", value: "الصف الثاني" },
    { label: "الصف الثالث", value: "الصف الثالث" },
    { label: "الصف الرابع", value: "الصف الرابع" },
    { label: "الصف الخامس", value: "الصف الخامس" },
    { label: "الصف السادس", value: "الصف السادس" },
  ],
  الإعدادية: [
    { label: "الصف الأول", value: "الصف الأول" },
    { label: "الصف الثاني", value: "الصف الثاني" },
    { label: "الصف الثالث", value: "الصف الثالث" },
  ],
  الثانوية: [
    { label: "الصف الأول", value: "الصف الأول" },
    { label: "الصف الثاني", value: "الصف الثاني" },
    { label: "الصف الثالث", value: "الصف الثالث" },
  ],
};

export const STAGE_SUFFIX: Record<string, string> = {
  الثانوية: "الثانوي",
  الإعدادية: "الإعدادي",
  الابتدائية: "الابتدائي",
};

export function toGradeLevel(stage: string, grade: string): string {
  if (!stage || !grade) return "";
  return `${grade} ${STAGE_SUFFIX[stage] || ""}`.trim();
}

export function parseGradeLevel(gradeLevel: string): { stage: string; grade: string } {
  if (!gradeLevel) return { stage: "", grade: "" };
  for (const [stage, suffix] of Object.entries(STAGE_SUFFIX)) {
    if (gradeLevel.endsWith(suffix)) {
      const grade = gradeLevel
        .slice(0, gradeLevel.length - suffix.length)
        .trim();
      if (
        grade &&
        (STAGE_GRADES as Record<string, { label: string; value: string }[]>)[
          stage
        ]?.some((g) => g.value === grade)
      ) {
        return { stage, grade };
      }
      return { stage, grade };
    }
  }
  return { stage: "", grade: "" };
}

export interface GroupOption {
  id: string;
  name: string;
  gradeLevel: string;
}
