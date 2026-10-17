'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { CertificateData } from './CertificateTemplateA';

interface CertificatePositionsFormProps {
  data: CertificateData;
  setData: React.Dispatch<React.SetStateAction<CertificateData>>;
}

export function CertificatePositionsForm({ data, setData }: CertificatePositionsFormProps) {
  return (
    <div className="pt-4 border-t border-slate-100">
      <h3 className="text-sm font-bold text-slate-800 mb-3">
        تعديل أماكن العناصر (X / Y)
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            موقع الدرجة (Score)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">X:</span>
              <Input
                type="number"
                value={data.scorePos.x}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    scorePos: {
                      ...p.scorePos,
                      x: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Y:</span>
              <Input
                type="number"
                value={data.scorePos.y}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    scorePos: {
                      ...p.scorePos,
                      y: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            موقع السنة (Year)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">X:</span>
              <Input
                type="number"
                value={data.yearPos.x}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    yearPos: {
                      ...p.yearPos,
                      x: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Y:</span>
              <Input
                type="number"
                value={data.yearPos.y}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    yearPos: {
                      ...p.yearPos,
                      y: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            موقع التاريخ (Date)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">X:</span>
              <Input
                type="number"
                value={data.datePos.x}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    datePos: {
                      ...p.datePos,
                      x: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Y:</span>
              <Input
                type="number"
                value={data.datePos.y}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    datePos: {
                      ...p.datePos,
                      y: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
