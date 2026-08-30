'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Download, Loader2, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { CertificateTemplateA, CertificateData } from './CertificateTemplateA';

export function CertificateBuilder() {
  const [data, setData] = useState<CertificateData>({
    studentName: '',
    gender: 'MALE',
    subject: '',
    score: '100',
    issueDate: new Date().toLocaleDateString('ar-EG'),
    year: new Date().getFullYear().toString(),
    teacherName: 'أحمد غريب', // Default or from profile
    stage: '',
    grade: '',
    yearPos: { x: 143, y: 573 },
    scorePos: { x: 577, y: 636 },
    datePos: { x: 388, y: 620 },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Auto-scale to fit container on load/resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // 1146 is the fixed width of the certificate
        const desiredScale = Math.min((containerWidth - 40) / 1146, 1);
        setScale(desiredScale);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleChange = (field: keyof CertificateData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setData({
      studentName: '',
      gender: 'MALE',
      subject: '',
      score: '100',
      issueDate: new Date().toLocaleDateString('ar-EG'),
      year: new Date().getFullYear().toString(),
      teacherName: 'أحمد غريب',
      stage: '',
      grade: '',
      yearPos: { x: 143, y: 573 },
      scorePos: { x: 577, y: 636 },
      datePos: { x: 388, y: 620 },
    });
  };

  const handleGenerate = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    try {
      // Create a clone to render without CSS transforms affecting html2canvas
      const clone = certificateRef.current.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 1.5, // Reduced scale to keep the file size smaller
        useCORS: true,
        backgroundColor: '#FDFDFD',
        width: 1146,
        height: 810,
        windowWidth: 1146,
        windowHeight: 810
      });
      
      document.body.removeChild(clone);

      // Convert canvas to a lightweight PNG or WebP data URL
      // (Using image/png is fine, but toDataURL may result in a larger size. We can use canvas.toBlob for better compression if needed)
      const imgData = canvas.toDataURL('image/png');
      
      // Trigger download
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `شهادة-${data.studentName || 'طالب'}.png`;
      link.click();
      
      // TODO: To upload this image to your bucket, you can convert it to a Blob and send it to your API:
      /*
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('file', blob, `شهادة-${data.studentName}.png`);
        // await fetch('/api/upload', { method: 'POST', body: formData });
      }, 'image/png');
      */
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      
      {/* Form Section */}
      <div className="xl:col-span-4 space-y-6 order-2 xl:order-1">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">بيانات الشهادة</h2>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500 hover:text-slate-700">
              <RefreshCw className="w-4 h-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطالب</label>
              <Input 
                value={data.studentName} 
                onChange={(e) => handleChange('studentName', e.target.value)} 
                placeholder="مثال: أحمد محمد علي"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">النوع</label>
              <Select 
                value={data.gender}
                onChange={(e) => handleChange('gender', e.target.value as any)}
                options={[
                  { label: 'ذكر (الطالب / أدائه)', value: 'MALE' },
                  { label: 'أنثى (الطالبة / أدائها)', value: 'FEMALE' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
              <Select 
                value={data.subject} 
                onChange={(e) => handleChange('subject', e.target.value)} 
                options={[
                  { label: 'اختر المادة...', value: '' },
                  { label: 'الإحصاء', value: 'الإحصاء' },
                  { label: 'الرياضيات', value: 'الرياضيات' },
                  { label: 'الفيزياء', value: 'الفيزياء' },
                  { label: 'الكيمياء', value: 'الكيمياء' },
                  { label: 'الأحياء', value: 'الأحياء' },
                  { label: 'اللغة العربية', value: 'اللغة العربية' },
                  { label: 'اللغة الإنجليزية', value: 'اللغة الإنجليزية' }
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المرحلة الدراسية</label>
                <Select 
                  value={data.stage} 
                  onChange={(e) => handleChange('stage', e.target.value)} 
                  options={[
                    { label: 'اختر المرحلة...', value: '' },
                    { label: 'الابتدائية', value: 'الابتدائية' },
                    { label: 'الإعدادية', value: 'الإعدادية' },
                    { label: 'الثانوية', value: 'الثانوية' },
                    { label: 'الجامعية', value: 'الجامعية' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الصف الدراسي</label>
                <Select 
                  value={data.grade} 
                  onChange={(e) => handleChange('grade', e.target.value)} 
                  options={[
                    { label: 'اختر الصف...', value: '' },
                    { label: 'الصف الأول', value: 'الصف الأول' },
                    { label: 'الصف الثاني', value: 'الصف الثاني' },
                    { label: 'الصف الثالث', value: 'الصف الثالث' },
                    { label: 'الصف الرابع', value: 'الصف الرابع' },
                    { label: 'الصف الخامس', value: 'الصف الخامس' },
                    { label: 'الصف السادس', value: 'الصف السادس' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الدرجة</label>
              <Input 
                type="number"
                value={data.score} 
                onChange={(e) => handleChange('score', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المعلم المانح</label>
              <Input 
                value={data.teacherName} 
                onChange={(e) => handleChange('teacherName', e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                <Input 
                  value={data.issueDate} 
                  onChange={(e) => handleChange('issueDate', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السنة</label>
                <Input 
                  value={data.year} 
                  onChange={(e) => handleChange('year', e.target.value)} 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-3">تعديل أماكن العناصر (X / Y)</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">موقع الدرجة (Score)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">X:</span>
                      <Input 
                        type="number" 
                        value={data.scorePos.x} 
                        onChange={(e) => setData(p => ({ ...p, scorePos: { ...p.scorePos, x: Number(e.target.value) } }))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Y:</span>
                      <Input 
                        type="number" 
                        value={data.scorePos.y} 
                        onChange={(e) => setData(p => ({ ...p, scorePos: { ...p.scorePos, y: Number(e.target.value) } }))} 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">موقع السنة (Year)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">X:</span>
                      <Input 
                        type="number" 
                        value={data.yearPos.x} 
                        onChange={(e) => setData(p => ({ ...p, yearPos: { ...p.yearPos, x: Number(e.target.value) } }))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Y:</span>
                      <Input 
                        type="number" 
                        value={data.yearPos.y} 
                        onChange={(e) => setData(p => ({ ...p, yearPos: { ...p.yearPos, y: Number(e.target.value) } }))} 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">موقع التاريخ (Date)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">X:</span>
                      <Input 
                        type="number" 
                        value={data.datePos.x} 
                        onChange={(e) => setData(p => ({ ...p, datePos: { ...p.datePos, x: Number(e.target.value) } }))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Y:</span>
                      <Input 
                        type="number" 
                        value={data.datePos.y} 
                        onChange={(e) => setData(p => ({ ...p, datePos: { ...p.datePos, y: Number(e.target.value) } }))} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-6 mt-4 border-t border-slate-100">
              <Button 
                variant="primary" 
                className="w-full py-6 text-lg font-bold" 
                onClick={handleGenerate}
                disabled={isGenerating || !data.studentName || !data.subject}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Download className="w-5 h-5 ml-2" />}
                إنشاء وتحميل الصورة
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="xl:col-span-8 order-1 xl:order-2">
        <Card className="flex flex-col h-full bg-slate-50/50 border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <h3 className="font-semibold text-slate-700">معاينة حية</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.3, s - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-600 w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(1.5, s + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="mr-4" onClick={() => {
                if (containerRef.current) {
                  const desiredScale = Math.min((containerRef.current.clientWidth - 40) / 1146, 1);
                  setScale(desiredScale);
                }
              }}>
                <Maximize2 className="w-4 h-4 ml-2" />
                احتواء
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-100/50 relative min-h-[600px]"
          >
            {/* The Scaled Wrapper */}
            <div 
              className="origin-center transition-transform duration-200 ease-out shadow-2xl rounded-sm"
              style={{ 
                transform: `scale(${scale})`,
                width: '1146px',
                height: '810px',
              }}
            >
              <CertificateTemplateA data={data} ref={certificateRef} />
            </div>
          </div>
        </Card>
      </div>

      {/* Certificate History */}
      <div className="xl:col-span-12 mt-8 order-3">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">الشهادات السابقة</h2>
        </div>
        <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-right">اسم الطالب</th>
                  <th className="py-4 px-6 text-right">المادة</th>
                  <th className="py-4 px-6 text-center">الدرجة</th>
                  <th className="py-4 px-6 text-center">التاريخ</th>
                  <th className="py-4 px-6 text-center">السنة</th>
                  <th className="py-4 px-6 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Mock data for now until API is connected */}
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    لا توجد شهادات سابقة بعد.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}
