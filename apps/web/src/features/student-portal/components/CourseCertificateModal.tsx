'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Award, Loader2, Sparkles, CheckCircle2, ZoomIn, ZoomOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import { CertificateTemplateA, CertificateData } from '../../certificates/components/CertificateTemplateA';
import toast from 'react-hot-toast';

interface CourseCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    studentName?: string;
    courseTitle?: string;
    teacherName?: string;
    subject?: string;
    gradeLevel?: string;
    academicStage?: string;
    completedAt?: string;
    score?: string | number;
    gender?: 'MALE' | 'FEMALE';
    certNumber?: string;
  };
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(0.7);
  const [particles] = useState(() => generateParticles(45));

  const containerRef = useRef<HTMLDivElement>(null);
  const certContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Map incoming props to CertificateTemplateA format
  const templateData: CertificateData = {
    studentName: data.studentName || 'اسم الطالب',
    gender: data.gender || 'MALE',
    subject: data.subject || data.courseTitle || 'المنهج الدراسي',
    score: data.score ? String(data.score) : '100',
    issueDate: data.completedAt
      ? new Date(data.completedAt).toLocaleDateString('ar-EG')
      : new Date().toLocaleDateString('ar-EG'),
    year: new Date().getFullYear().toString(),
    teacherName: data.teacherName || 'أ. طارق عبد الله',
    stage: data.academicStage || 'المرحلة الثانوية',
    grade: data.gradeLevel || 'الصف الثالث الثانوي',
    yearPos: { x: 143, y: 573 },
    scorePos: { x: 577, y: 636 },
    datePos: { x: 388, y: 620 },
  };

  // Auto-scale to fit modal width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 32;
        const targetWidth = 1146;
        const calculated = Math.min(Math.max(availableWidth / targetWidth, 0.3), 0.95);
        setScale(calculated);
      }
    };

    if (isOpen) {
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen]);

  // Handle Download PNG via html2canvas
  const handleDownload = async () => {
    if (!certContainerRef.current) return;

    try {
      setIsDownloading(true);
      toast('جاري تجهيز وتحميل الشهادة بجودة فائقة...', { icon: '🎓' });

      // Clone certificate element into offscreen container with exact original dimensions
      const cloned = certContainerRef.current.cloneNode(true) as HTMLElement;
      cloned.style.transform = 'none';
      cloned.style.position = 'fixed';
      cloned.style.top = '-9999px';
      cloned.style.left = '-9999px';
      cloned.style.width = '1146px';
      cloned.style.height = '810px';
      document.body.appendChild(cloned);

      const canvas = await html2canvas(cloned, {
        scale: 2, // High-res 2x
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1146,
        height: 810,
      });

      document.body.removeChild(cloned);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `شهادة-إتمام-${data.studentName || 'طالب'}-${data.courseTitle || 'كورس'}.png`;
      link.click();

      toast.success('تم تحميل الشهادة بنجاح 🎉');
    } catch (err) {
      console.error('Failed to download certificate:', err);
      toast.error('تعذر تحميل الشهادة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsDownloading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto"
      style={{ animation: 'fadeIn 0.25s ease' }}
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

      {/* Modal Card */}
      <div
        dir="rtl"
        className="relative z-[102] bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-100 overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-amber-500/10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center border border-amber-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">شهادة تقدير وتفوق دراسي معتمدة</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  إتمام 100%
                </span>
              </div>
              <p className="text-xs text-slate-500">{data.courseTitle || templateData.subject}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Display Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/5 flex flex-col items-center justify-center min-h-[420px]"
        >
          {/* Subtle Banner */}
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border border-amber-200/80 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              تهانينا! لقد أتممت جميع دروس واختبارات المنهج بنجاح وتفوق
            </span>
          </div>

          {/* Scaled Certificate Frame */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-300/60 bg-white"
            style={{
              width: `${1146 * scale}px`,
              height: `${810 * scale}px`,
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: '1146px',
                height: '810px',
              }}
            >
              <CertificateTemplateA ref={certContainerRef} data={templateData} />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 hover:from-amber-700 hover:to-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-600/20 hover:shadow-lg cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تجهيز التحميل...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل الشهادة فائقة الدقة (PNG)</span>
                </>
              )}
            </button>
          </div>
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
