'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSiteSettings, usePublicCertificates } from '@/hooks/usePublicContent';
import { GRADE_LEVELS_BY_STAGE } from '@/lib/constants/grades';
import { API_BASE_URL } from '@/lib/api/endpoints';

// Static honor-roll seeds — always shown in the landing certificates section
// (merged with backend + local certificates, never overwritten by them).
const SEED_CERTIFICATES = [
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

const CERTIFICATES_BY_STAGE = [
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

function getCertificateIdentity(cert: any) {
  const student = String(cert?.student || cert?.studentName || "").trim();
  const subject = String(cert?.subject || "").trim();
  const stage = String(cert?.stage || "").trim();
  const year = String(cert?.year || "").trim();
  const grade = String(cert?.grade || cert?.score || "").trim();
  const id = String(cert?.id || "").trim();
  return id || `${student}|${subject}|${stage}|${year}|${grade}`;
}

function CertificateCard({ cert, index }: { cert: any; index: number }) {
  const displayName = cert.student || cert.studentName || "طالب";
  const displayTitle = cert.title || (cert.subject ? `التفوق في ${cert.subject}` : "شهادة تقدير");
  const hasRealCertificateImage = Boolean(cert.image) && cert.image !== "/certification-bg.webp";

  return (
    <div
      key={`${cert.id || displayName}-${index}`}
      className="shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group"
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] mb-4">
        <img
          src={cert.image}
          alt={displayTitle}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {!hasRealCertificateImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="font-black text-slate-800 text-lg sm:text-xl leading-snug drop-shadow-sm">
              {displayName}
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-700 mt-1.5">
              {displayTitle}
            </div>
            {cert.grade && (
              <div className="mt-1.5 text-sm font-black text-slate-700 bg-white/70 border border-amber-200 px-3 py-0.5 rounded-full shadow-sm">
                الدرجة: {cert.grade}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-center px-2 pb-2">
        <h4 className="font-bold text-slate-900 truncate">{displayName}</h4>
        <p className="text-sm text-slate-500 truncate">{displayTitle}</p>
        {(cert.grade || cert.year) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {cert.grade && (
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                الدرجة: {cert.grade}
              </span>
            )}
            {cert.year && (
              <span className="text-xs font-semibold text-slate-500">
                {cert.year}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StageCertificateRow({ certificates }: { certificates: any[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const normalizedList =
    certificates && certificates.length > 0
      ? certificates.length < 8
        ? Array.from({
            length: Math.ceil(8 / certificates.length),
          }).flatMap(() => certificates)
        : certificates
      : [];

  // JS-driven marquee (requestAnimationFrame + inline transform).
  // A CSS keyframes animation was unreliable here: it stayed static whenever
  // the cards fit the wide desktop container, and globals.css kills ALL CSS
  // animations under `prefers-reduced-motion: reduce` (common on Windows when
  // "Animation effects" are off) — while phones kept moving. rAF is immune to
  // both, so desktop and phone behave identically.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || normalizedList.length === 0) return;

    const SPEED_PX_PER_SEC = 80; // rightward (left-to-right), like before
    let raf = 0;
    let last = performance.now();
    let half = track.offsetWidth / 2;
    let x = -half;

    const measure = () => {
      half = track.offsetWidth / 2;
      if (half > 0) {
        if (x > 0) x -= half;
        if (x < -half) x += half;
      }
    };
    measure();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    // Re-measure once layout settles (fonts / late paint).
    const settleTimer = window.setTimeout(measure, 600);

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Never pauses — no hover stop, keeps moving on desktop and phone.
      if (half <= 0) measure();
      if (half > 0) {
        x += SPEED_PX_PER_SEC * dt;
        if (x >= 0) x -= half;
        track.style.transform = `translate3d(${x}px,0,0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(settleTimer);
    };
  }, [certificates, normalizedList.length]);

  if (!certificates || certificates.length === 0) return null;

  return (
    <div className="w-full overflow-hidden pb-6">
      <div className="relative w-full overflow-hidden" dir="ltr">
        <div ref={trackRef} className="flex w-max will-change-transform" dir="ltr">
          <div className="flex gap-6 pr-6 shrink-0" dir="rtl">
            {normalizedList.map((cert, index) => (
              <CertificateCard
                cert={cert}
                index={index}
                key={`set1-${cert.id}-${index}`}
              />
            ))}
          </div>
          <div className="flex gap-6 pr-6 shrink-0" dir="rtl" aria-hidden="true">
            {normalizedList.map((cert, index) => (
              <CertificateCard
                cert={cert}
                index={index}
                key={`set2-${cert.id}-${index}`}
              />
            ))}
          </div>
        </div>
        {/* Transparent fading sides — softens the hard cut-off at both edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />
      </div>
    </div>
  );
}

export function CertificatesSection() {
  const [stagesData, setStagesData] = useState(CERTIFICATES_BY_STAGE);
  const { data: siteSettings } = useSiteSettings();
  const { data: publicCerts = [] } = usePublicCertificates();

  // Owner control: academic years allowed on the landing page (null = all).
  // Managed from the teacher dashboard (سنوات الظهور على الموقع), cached via TanStack Query.
  const allowedYears = React.useMemo(() => {
    const raw = siteSettings?.certificatesVisibleYears;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedStages = React.useMemo(() => {
    const raw = siteSettings?.certificatesVisibleStages;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedGrades = React.useMemo(() => {
    const raw = siteSettings?.certificatesVisibleGrades;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const allowedGroups = React.useMemo(() => {
    const raw = siteSettings?.certificatesVisibleGroups;
    return Array.isArray(raw)
      ? raw.map((v: any) => String(v).trim()).filter(Boolean)
      : null;
  }, [siteSettings]);

  const normalizeCertificateGrade = (grade: unknown, stage: unknown) => {
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
  };

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
              // Upload to backend using the thumbnail base64 as fileUrl
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
              formData.append("fileUrl", cert.image); // Sending base64 as url fallback

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

        // 3. Fetch all certificates from backend (which now includes the synced ones)
        let apiCerts = Array.isArray(publicCerts) && publicCerts.length > 0 ? publicCerts : [];
        if (apiCerts.length === 0) {
          try {
            const res = await fetch(`${baseUrl}/certificates/public`);
            if (res.ok) {
              const json = await res.json();
              apiCerts = json?.data || json || [];
            }
          } catch (apiError) {
            console.warn("Could not fetch API certificates", apiError);
          }
        }

        // Ensure arrays
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
          setStagesData(CERTIFICATES_BY_STAGE); // Reset if nothing found
        }
      } catch (e) {
        console.error("Failed to sync/fetch certificates:", e);
      }
    };

    syncAndFetchCertificates();
  }, [publicCerts]);

  return (
    <section
      className="py-24 bg-slate-50 relative overflow-hidden"
      id="certificates"
      dir="rtl"
    >
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[40%] rounded-full bg-amber-50 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[40%] h-[30%] rounded-full bg-orange-50 blur-[120px]" />
      </div>

      <div className="w-full max-w-[98%] 2xl:max-w-[1880px] mx-auto px-2 sm:px-4 md:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              لوحة{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                الشرف
              </span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نحتفي بطلابنا المتميزين والمتفوقين، شهادات تقدير لأبطال منصة الأول
              في جميع المراحل.
            </p>
          </motion.div>
        </div>

        {/* Academic year + class filters */}
        <div className="space-y-16">
          {visibleStages.length === 0 ? (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                لا توجد شهادات حالياً
              </h3>
              <p className="text-slate-500">
                لم يتم إصدار أو مزامنة أي شهادات بعد. كن أول المتفوقين!
              </p>
            </div>
          ) : (
            visibleStages.map((stage, stageIndex) => (
              <motion.div
                key={stage.stageId}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: stageIndex * 0.1 }}
              >
                <div className="flex items-center justify-between mb-6 px-1 sm:px-2">
                  <h3 className="text-2xl font-bold text-slate-800 border-r-4 border-amber-500 pr-4">
                    {stage.stageName}
                  </h3>
                </div>

                {/* Fixed row when cards fit — auto marquee only when overflowing */}
                <StageCertificateRow certificates={stage.certificates} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}