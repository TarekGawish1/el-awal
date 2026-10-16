'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicCenters } from '@/hooks/usePublicContent';

export function CenterScheduleSection() {
  const [selectedStage, setSelectedStage] = useState('secondary');
  const [selectedGrade, setSelectedGrade] = useState('الصف الأول الثانوي');

  const { data: rawCentersData = [], isLoading } = usePublicCenters();

  const STAGES = [
    { id: 'primary', name: 'المرحلة الابتدائية' },
    { id: 'preparatory', name: 'المرحلة الإعدادية' },
    { id: 'secondary', name: 'المرحلة الثانوية' },
  ];

  const GRADES = {
    primary: [
      { id: 'الصف الخامس الابتدائي', name: 'الصف الخامس الابتدائي' },
      { id: 'الصف السادس الابتدائي', name: 'الصف السادس الابتدائي' },
    ],
    preparatory: [
      { id: 'الصف الأول الإعدادي', name: 'الصف الأول الإعدادي' },
      { id: 'الصف الثاني الإعدادي', name: 'الصف الثاني الإعدادي' },
      { id: 'الصف الثالث الإعدادي', name: 'الصف الثالث الإعدادي' },
    ],
    secondary: [
      { id: 'الصف الأول الثانوي', name: 'الصف الأول الثانوي' },
      { id: 'الصف الثاني الثانوي', name: 'الصف الثاني الثانوي' },
      { id: 'الصف الثالث الثانوي', name: 'الصف الثالث الثانوي' },
    ],
  };

  const schedulesMap = useMemo(() => {
    const actualData = Array.isArray(rawCentersData)
      ? rawCentersData
      : (rawCentersData as any)?.data || [];
    const newMap: Record<string, { center: string; days: string; time: string }[]> = {};
    actualData.forEach((item: any) => {
      if (!newMap[item.gradeLevel]) {
        newMap[item.gradeLevel] = [];
      }
      if (Array.isArray(item.schedules)) {
        newMap[item.gradeLevel].push(...item.schedules);
      }
    });
    return newMap;
  }, [rawCentersData]);

  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    setSelectedGrade(GRADES[stageId as keyof typeof GRADES][0].id);
  };

  const currentSchedules = schedulesMap[selectedGrade] || [];
  const currentGrades = GRADES[selectedStage as keyof typeof GRADES] || [];

  return (
    <section
      className="py-24 bg-slate-50 relative overflow-hidden"
      id="schedule"
      dir="rtl"
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              مواعيد{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                السنتر
              </span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              اختر المرحلة والصف الدراسي لمعرفة مواعيد وأماكن المحاضرات الحضورية
              المتاحة.
            </p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {/* Stage Selector (Dropdown on Mobile, Tabs on Desktop) */}
          <div className="border-b border-slate-100 bg-slate-100/50 p-4">
            {/* Mobile Dropdown */}
            <div className="sm:hidden block w-full relative">
              <label htmlFor="stage-select" className="sr-only">
                اختر المرحلة الدراسية
              </label>
              <select
                id="stage-select"
                aria-label="اختر المرحلة الدراسية"
                value={selectedStage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-900 font-bold py-3 pr-4 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-sm"
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden sm:flex gap-2 justify-center">
              {STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={`px-8 py-3 rounded-xl font-bold text-base transition-all ${
                    selectedStage === stage.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Tabs */}
          <div className="flex flex-wrap border-b border-slate-100 bg-white p-2 sm:p-4 gap-2 justify-center">
            {currentGrades.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGrade(grade.id)}
                className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all ${
                  selectedGrade === grade.id
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-600'
                    : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-200'
                }`}
              >
                {grade.name}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="p-6 sm:p-8 min-h-[250px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p>جاري تحميل المواعيد...</p>
              </div>
            ) : currentSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg font-medium">
                  لا توجد مواعيد متاحة حالياً لهذا الصف
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedGrade}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {currentSchedules.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:border-blue-100 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-4">
                            {item.center}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {item.days}
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {item.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            <div className="mt-10 text-center">
              <Link
                href="/login"
                className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-1 inline-flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                <span>احجز مكانك الآن</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
