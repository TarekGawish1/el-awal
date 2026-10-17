import { GRADE_LEVELS_BY_STAGE } from '@/lib/constants/grades';

// Static honor-roll seeds — always shown in the landing certificates section
// (merged with backend + local certificates, never overwritten by them).
export const SEED_CERTIFICATES = [
  {
    id: "seed-1",
    student: "حنين طه محمد",
    subject: "الإحصاء",
    grade: "57",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-2",
    student: "نور احمد طه",
    subject: "الإحصاء",
    grade: "58",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-3",
    student: "ميرنا يحيى عبد المنعم",
    subject: "الإحصاء",
    grade: "59",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-4",
    student: "شهد وائل السعيد",
    subject: "الإحصاء",
    grade: "56",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-5",
    student: "جنى صلاح عبد الرازق",
    subject: "الإحصاء",
    grade: "59.5",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-6",
    student: "حنين محمد سندي",
    subject: "الإحصاء",
    grade: "59.5",
    year: "2026",
    stage: "الثانوية",
  },
  {
    id: "seed-p1",
    student: "أمير رضا عبد الرؤوف",
    subject: "الرياضيات",
    grade: "57",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p2",
    student: "محمد صالح جابر",
    subject: "الرياضيات",
    grade: "57",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p3",
    student: "ملك فريدة العباسي",
    subject: "الرياضيات",
    grade: "59",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p4",
    student: "عمر محمد عبد الهادي",
    subject: "الرياضيات",
    grade: "57",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p5",
    student: "جودي أحمد مشعل",
    subject: "الرياضيات",
    grade: "59",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p6",
    student: "شهد محمد السيد مراد",
    subject: "الرياضيات",
    grade: "58.2",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p7",
    student: "شيرين محمد شحاتة",
    subject: "الرياضيات",
    grade: "59.5",
    year: "2026",
    stage: "الإعدادية",
  },
  {
    id: "seed-p8",
    student: "أدهم أحمد عمرو وسليم",
    subject: "الرياضيات",
    grade: "59.5",
    year: "2026",
    stage: "الإعدادية",
  },
].map((s) => ({
  id: s.id,
  title: `التفوق في ${s.subject}`,
  subject: s.subject,
  student: s.student,
  grade: s.grade, // الدرجة (score) — feeds the grade badge
  classGrade: "", // الصف الدراسي — seeds predate class linking
  year: s.year,
  image: "/certification-bg.webp",
  stage: s.stage,
  isPublic: true,
}));

export const CERTIFICATES_BY_STAGE = [
  {
    stageId: "secondary",
    stageName: "أبطال المرحلة الثانوية",
    certificates: [...SEED_CERTIFICATES] as any[],
  },
  {
    stageId: "preparatory",
    stageName: "أبطال المرحلة الإعدادية",
    certificates: [] as any[],
  },
  {
    stageId: "primary",
    stageName: "أبطال المرحلة الابتدائية",
    certificates: [] as any[],
  },
];

export function getCertificateIdentity(cert: any) {
  const student = String(cert?.student || cert?.studentName || "").trim();
  const subject = String(cert?.subject || "").trim();
  const stage = String(cert?.stage || "").trim();
  const year = String(cert?.year || "").trim();
  const grade = String(cert?.grade || cert?.score || "").trim();
  const id = String(cert?.id || "").trim();
  return id || `${student}|${subject}|${stage}|${year}|${grade}`;
}

export function normalizeCertificateGrade(grade: unknown, stage: unknown) {
  const value = String(grade || "").trim();
  if (!value) return "";
  if (
    Object.values(GRADE_LEVELS_BY_STAGE).some((grades) =>
      grades.includes(value),
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
}
