'use client';

import React, { useRef, useState } from 'react';
import { CertificateTemplateA, CertificateData } from '@/features/certificates/components/CertificateTemplateA';
import html2canvas from 'html2canvas';

const STUDENTS = [
  { name: 'أمير رضا عبد الرؤوف', score: '57', gender: 'MALE' as const },
  { name: 'محمد صالح جابر', score: '57', gender: 'MALE' as const },
  { name: 'ملك فريدة العباسي', score: '59', gender: 'FEMALE' as const },
  { name: 'عمر محمد عبد الهادي', score: '57', gender: 'MALE' as const },
  { name: 'جودي أحمد مشعل', score: '59', gender: 'FEMALE' as const },
  { name: 'شهد محمد السيد مراد', score: '58.2', gender: 'FEMALE' as const },
  { name: 'شيرين محمد شحاتة', score: '59.5', gender: 'FEMALE' as const },
  { name: 'أدهم أحمد عمرو وسليم', score: '59.5', gender: 'MALE' as const },
];

export default function ExportCertsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadAll = async () => {
    if (!containerRef.current) return;
    setIsGenerating(true);

    const certNodes = containerRef.current.querySelectorAll('.cert-wrapper');
    
    try {
      await document.fonts.ready;

      for (let i = 0; i < certNodes.length; i++) {
        const node = certNodes[i] as HTMLElement;
        const studentName = STUDENTS[i].name;
        
        // Clone for rendering off-screen properly like in builder
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '0';
        wrapper.style.height = '0';
        wrapper.style.overflow = 'hidden';

        const clone = node.cloneNode(true) as HTMLElement;
        clone.style.margin = '0';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FDFDFD',
          width: 1146,
          height: 810,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1146,
          windowHeight: 810
        });

        document.body.removeChild(wrapper);
        const imgData = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = imgData;
        link.download = `شهادة-${studentName}.png`;
        link.click();
        
        // Wait a bit before next download so the browser doesn't freeze or block
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">تصدير الشهادات - رياضيات إعدادي 2025</h1>
        <button
          onClick={handleDownloadAll}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50"
        >
          {isGenerating ? 'جاري التحميل...' : 'تحميل جميع الشهادات'}
        </button>
      </div>

      <div ref={containerRef} className="space-y-12">
        {STUDENTS.map((student, idx) => {
          const data: CertificateData = {
            studentName: student.name,
            gender: student.gender,
            subject: 'الرياضيات',
            score: student.score,
            issueDate: '2025',
            year: '2025',
            teacherName: 'أحمد غريب',
            stage: 'الإعدادية',
            grade: '', // didn't specify exactly which prep grade, leave empty or use default
            yearPos: { x: 143, y: 573 },
            scorePos: { x: 577, y: 636 },
            datePos: { x: 388, y: 620 },
          };

          return (
            <div key={idx} className="border p-4 rounded-lg bg-gray-50 flex flex-col items-center">
              <h2 className="text-lg font-bold mb-4">{student.name}</h2>
              <div 
                className="cert-wrapper transform scale-50 origin-top"
                style={{ width: '1146px', height: '810px' }}
              >
                <CertificateTemplateA data={data} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
