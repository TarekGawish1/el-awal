'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Download, Loader2, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { CertificateTemplateA, CertificateData } from './CertificateTemplateA';

const STAGE_GRADES = {
  'الابتدائية': [
    { label: 'الصف الأول', value: 'الصف الأول' },
    { label: 'الصف الثاني', value: 'الصف الثاني' },
    { label: 'الصف الثالث', value: 'الصف الثالث' },
    { label: 'الصف الرابع', value: 'الصف الرابع' },
    { label: 'الصف الخامس', value: 'الصف الخامس' },
    { label: 'الصف السادس', value: 'الصف السادس' },
  ],
  'الإعدادية': [
    { label: 'الصف الأول', value: 'الصف الأول' },
    { label: 'الصف الثاني', value: 'الصف الثاني' },
    { label: 'الصف الثالث', value: 'الصف الثالث' },
  ],
  'الثانوية': [
    { label: 'الصف الأول', value: 'الصف الأول' },
    { label: 'الصف الثاني', value: 'الصف الثاني' },
    { label: 'الصف الثالث', value: 'الصف الثالث' },
  ],
};

// TODO: Replace with real API fetch based on stage and grade
const MOCK_STUDENTS = [
  { id: 1, name: 'أحمد محمد علي', gender: 'MALE', stage: 'الثانوية', grade: 'الصف الأول' },
  { id: 2, name: 'سارة خالد أحمد', gender: 'FEMALE', stage: 'الثانوية', grade: 'الصف الأول' },
  { id: 3, name: 'عمر طارق جاويش', gender: 'MALE', stage: 'الإعدادية', grade: 'الصف الثالث' },
  { id: 4, name: 'منى محمود عبدلله', gender: 'FEMALE', stage: 'الإعدادية', grade: 'الصف الثالث' },
  { id: 5, name: 'مصطفى السيد محمود', gender: 'MALE', stage: 'الابتدائية', grade: 'الصف السادس' },
];

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
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredStudents = React.useMemo(() => {
    if (!data.stage || !data.grade) return [];
    return MOCK_STUDENTS.filter(s => 
      s.stage === data.stage && 
      s.grade === data.grade && 
      s.name.includes(data.studentName)
    );
  }, [data.stage, data.grade, data.studentName]);

  const containerRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Auto-scale to fit container on load/resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Template A is 1146px wide (from viewBox)
        const targetWidth = 1146; 
        
        // Add some padding (e.g., 32px) so it doesn't touch the edges
        const availableWidth = containerWidth - 32;
        
        // If container is smaller than target, scale down
        // If larger, we could scale up, but usually we cap at scale 1 (or allow slight upscale)
        const newScale = Math.min(availableWidth / targetWidth, 1.2); 
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleChange = (field: keyof CertificateData, value: any) => {
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
      // Create a fixed wrapper to prevent scroll/offset issues in html2canvas
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';

      const clone = certificateRef.current.cloneNode(true) as HTMLElement;
      clone.style.margin = '0';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Ensure fonts are fully loaded before rendering
      await document.fonts.ready;

      const canvas = await html2canvas(clone, {
        scale: 2, // Better resolution
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

      // Convert canvas to a lightweight PNG or WebP data URL
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
      // Optional: Add toast notification for error
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المرحلة الدراسية</label>
                  <Select 
                    value={data.stage} 
                    onChange={(e) => {
                      handleChange('stage', e.target.value);
                      handleChange('grade', ''); // Reset grade when stage changes
                    }} 
                    options={[
                      { label: 'اختر المرحلة...', value: '' },
                      { label: 'الابتدائية', value: 'الابتدائية' },
                      { label: 'الإعدادية', value: 'الإعدادية' },
                      { label: 'الثانوية', value: 'الثانوية' },
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
                      ...(data.stage && STAGE_GRADES[data.stage as keyof typeof STAGE_GRADES] ? STAGE_GRADES[data.stage as keyof typeof STAGE_GRADES] : []),
                    ]}
                    disabled={!data.stage}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطالب</label>
                <Input 
                  value={data.studentName} 
                  onChange={(e) => {
                    handleChange('studentName', e.target.value);
                    setShowSuggestions(true);
                  }} 
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={(!data.stage || !data.grade) ? "اختر المرحلة والصف أولاً..." : "ابحث عن اسم الطالب..."}
                  disabled={!data.stage || !data.grade}
                />
                {showSuggestions && filteredStudents.length > 0 && (
                  <div className="absolute top-[100%] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredStudents.map(student => (
                      <div 
                        key={student.id} 
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent onBlur from firing before click
                          handleChange('studentName', student.name);
                          handleChange('gender', student.gender as any);
                          setShowSuggestions(false);
                        }}
                      >
                        {student.name}
                      </div>
                    ))}
                  </div>
                )}
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
                    { label: 'اللغة الإنجليزية', value: 'اللغة الإنجليزية' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الدرجة</label>
                <Input 
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
                  className="w-full py-6 text-lg bg-indigo-500 hover:bg-indigo-600 shadow-md"
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
          <Card className="p-4 bg-slate-50 overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-semibold text-slate-700">المعاينة الحية</h3>
              
              <div className="flex items-center bg-white rounded-md shadow-sm border border-slate-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setScale(s => Math.max(s - 0.1, 0.3))}
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
                  onClick={() => setScale(s => Math.min(s + 0.1, 2))}
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
              style={{ minHeight: '600px' }}
            >
              <div 
                className="transition-transform duration-200 ease-out origin-top flex-shrink-0"
                style={{ 
                  transform: `scale(${scale})`,
                  width: '1146px',
                  height: '810px'
                }}
              >
                <CertificateTemplateA ref={certificateRef} data={data} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
