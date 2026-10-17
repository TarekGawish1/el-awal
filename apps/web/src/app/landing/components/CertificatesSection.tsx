'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useCertificatesSync } from './certificates/useCertificatesSync';
import { StageCertificateRow } from './certificates/StageCertificateRow';

export function CertificatesSection() {
  const { visibleStages } = useCertificatesSync();

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

                <StageCertificateRow certificates={stage.certificates} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}