'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Award, Loader2 } from 'lucide-react';
import { generateCertificate, downloadCertificate, CertificateData } from '../utils/generateCertificate';

interface CourseCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CertificateData;
}

// Confetti particle
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

const CONFETTI_COLORS = [
  '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8',
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2,
    rotation: Math.random() * 360,
  }));
}

export function CourseCertificateModal({ isOpen, onClose, data }: CourseCertificateModalProps) {
  const [certDataUrl, setCertDataUrl] = useState<string | null>(null);
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [particles] = useState(() => generateParticles(40));
  const overlayRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(() => {
    setIsGenerating(true);
    // Use rAF to avoid blocking the modal open animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const { dataUrl, certNumber: cn } = generateCertificate(data);
          setCertDataUrl(dataUrl);
          setCertNumber(cn);
        } catch (e) {
          console.error('Certificate generation failed:', e);
        } finally {
          setIsGenerating(false);
        }
      });
    });
  }, [data]);

  useEffect(() => {
    if (isOpen) {
      setCertDataUrl(null);
      setCertNumber(null);
      generate();
    }
  }, [isOpen, generate]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      {/* Confetti particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[101]">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Modal panel */}
      <div
        className="relative z-[102] bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-100 bg-gradient-to-r from-slate-50 to-cyan-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-xl">
              <Award className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">شهادة الإتمام</h2>
              <p className="text-xs text-slate-500">{data.courseTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Certificate preview */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-4">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              <p className="text-sm font-medium">جاري إنشاء الشهادة...</p>
            </div>
          ) : certDataUrl ? (
            <div className="w-full">
              {/* Subtle celebration badge above preview */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-800 border border-cyan-200 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                  تهانينا، أتممت الدورة بنجاح
                </span>
              </div>

              {/* Certificate image preview */}
               <div className="rounded-xl overflow-hidden border-2 border-cyan-200 shadow-lg shadow-cyan-100/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={certDataUrl}
                  alt="شهادة الإتمام"
                  className="w-full block"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>

              {/* Certificate number display */}
              {certNumber && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">رقم الشهادة:</span>
                  <span className="font-mono text-xs font-bold tracking-widest text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1 rounded-lg select-all">
                    {certNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
              <Award className="w-12 h-12" />
              <p className="text-sm">تعذر إنشاء الشهادة</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={() => downloadCertificate(data)}
            disabled={!certDataUrl || isGenerating}
             className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-cyan-200 hover:shadow-md hover:shadow-cyan-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download className="w-4 h-4" />
            تحميل الشهادة (PNG)
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}
