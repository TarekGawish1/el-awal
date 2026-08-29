'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function CertificateBuilder() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('100');
  const [date, setDate] = useState(new Date().toLocaleDateString('ar-EG'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/certificate-template.svg')
      .then(res => res.text())
      .then(text => setSvgContent(text));
  }, []);

  const handleGenerate = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: null
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`certificate-${name || 'student'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getGenderText = () => gender === 'MALE' ? 'الطالب' : 'الطالبة';
  const getGrammarText1 = () => gender === 'MALE' ? 'أدائه المتميز وتفوقه العلمي الملحوظ في مادة' : 'أدائها المتميز وتفوقها العلمي الملحوظ في مادة';
  const getGrammarText2 = () => gender === 'MALE' ? 'متمنياً له مستقبلاً واعداً ومزيداً من النجاح والتألق.' : 'متمنياً لها مستقبلاً واعداً ومزيداً من النجاح والتألق.';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Form Section */}
      <div className="xl:col-span-1 space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">بيانات الشهادة</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الطالب</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="أحمد محمد..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">النوع</label>
              <Select 
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                options={[
                  { label: 'ذكر', value: 'MALE' },
                  { label: 'أنثى', value: 'FEMALE' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
              <Input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="الإحصاء"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الدرجة</label>
              <Input 
                type="number"
                value={score} 
                onChange={(e) => setScore(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                <Input 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السنة</label>
                <Input 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <Button 
                variant="primary" 
                className="w-full" 
                onClick={handleGenerate}
                disabled={isGenerating || !name || !subject}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
                إنشاء وتحميل PDF
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="xl:col-span-2">
        <Card className="p-6 bg-slate-50 border-dashed border-2 overflow-hidden flex justify-center items-center">
          <div className="w-full max-w-4xl relative shadow-lg" ref={certificateRef}>
            {/* The SVG Container */}
            {svgContent ? (
              <div 
                className="w-full h-auto relative" 
                style={{ aspectRatio: '1577/1471' }}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: svgContent }} 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  style={{ '& svg': { width: '100%', height: '100%' } } as any}
                />
                
                {/* Dynamic SVG Text Overlay */}
                <svg viewBox="0 0 1577 1471" className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                  <style>
                    {`
                      .cert-name { font-family: 'Amiri', 'Tajawal', sans-serif; font-weight: bold; fill: #155EEF; font-size: 85px; }
                      .cert-text { font-family: 'Amiri', 'Tajawal', sans-serif; fill: #2c2d2a; font-size: 26px; }
                      .cert-text-bold { font-family: 'Amiri', 'Tajawal', sans-serif; font-weight: bold; fill: #2c2d2a; font-size: 26px; }
                      .cert-score { font-family: 'Amiri', 'Tajawal', sans-serif; font-weight: bold; fill: #155EEF; font-size: 80px; }
                      .cert-date { font-family: 'Amiri', 'Tajawal', sans-serif; fill: #2c2d2a; font-size: 20px; }
                      .cert-year { font-family: 'Arial', sans-serif; font-weight: bold; fill: #2c2d2a; font-size: 24px; }
                    `}
                  </style>

                  {/* A: Student Name */}
                  <text x="788" y="635" textAnchor="middle" className="cert-name">
                    {name || 'اسم الطالب'}
                  </text>

                  {/* B: Sentence 1 (Gender) */}
                  <text x="788" y="490" textAnchor="middle" className="cert-text" direction="rtl" unicodeBidi="bidi-override">
                    يسر الأستاذ أحمد غريب أن يمنح هذه الشهادة إلى {getGenderText()}
                  </text>

                  {/* C: Sentence 2 & 3 (Subject) */}
                  <text x="788" y="730" textAnchor="middle" className="cert-text" direction="rtl" unicodeBidi="bidi-override">
                    وذلك تقديراً لـ {getGrammarText1()} <tspan className="cert-text-bold">{subject || '.......'}</tspan>
                  </text>
                  <text x="788" y="770" textAnchor="middle" className="cert-text" direction="rtl" unicodeBidi="bidi-override">
                    {getGrammarText2()}
                  </text>

                  {/* D: Score */}
                  <text x="948" y="930" textAnchor="middle" className="cert-score">
                    {score}
                  </text>

                  {/* E: Date */}
                  <text x="716" y="920" textAnchor="middle" className="cert-date" direction="rtl" unicodeBidi="bidi-override">
                    {date}
                  </text>

                  {/* F: Year */}
                  <text x="532" y="833" textAnchor="middle" className="cert-year">
                    {year}
                  </text>
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
