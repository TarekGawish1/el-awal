"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { CertificateTemplateA, CertificateData } from "./CertificateTemplateA";

interface CertificatePreviewSectionProps {
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  certificateRef: React.RefObject<HTMLDivElement | null>;
  data: CertificateData;
}

export function CertificatePreviewSection({
  scale,
  setScale,
  containerRef,
  certificateRef,
  data,
}: CertificatePreviewSectionProps) {
  return (
    <Card className="p-4 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-lg font-semibold text-slate-700">المعاينة الحية</h3>

        <div className="flex items-center bg-white rounded-md shadow-sm border border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
            className="rounded-none rounded-r-md px-3"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4 text-slate-600" />
          </Button>

          <span className="text-xs font-medium text-slate-600 px-3 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScale((s) => Math.min(s + 0.1, 2))}
            className="rounded-none px-3 border-r border-slate-200"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4 text-slate-600" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScale(1)}
            className="rounded-none rounded-l-md px-3 border-r border-slate-200"
            title="الحجم الطبيعي"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full flex justify-center overflow-x-auto custom-scrollbar pb-4 bg-slate-100 rounded-lg shadow-inner"
        style={{ minHeight: "600px" }}
      >
        <div
          className="transition-transform duration-200 ease-out origin-top flex-shrink-0"
          style={{
            transform: `scale(${scale})`,
            width: "1146px",
            height: "810px",
          }}
        >
          <CertificateTemplateA ref={certificateRef} data={data} />
        </div>
      </div>
    </Card>
  );
}
