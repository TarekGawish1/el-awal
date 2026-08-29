import React, { forwardRef } from 'react';

export interface CertificateData {
  studentName: string;
  gender: 'MALE' | 'FEMALE';
  subject: string;
  score: string;
  issueDate: string;
  year: string;
  teacherName: string;
}

interface Props {
  data: CertificateData;
}

export const CertificateTemplateA = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const isMale = data.gender === 'MALE';
  const getGrammarText1 = () => isMale ? 'لأدائه المتميز وتفوقه' : 'لأدائها المتميز وتفوقها';
  const getGrammarText2 = () => isMale ? 'متمنيًا له مستقبلًا واعدًا' : 'متمنيًا لها مستقبلًا واعدًا';

  return (
    <div
      ref={ref}
      dir="rtl"
      className="relative bg-white overflow-hidden"
      style={{
        width: '1123px',
        height: '794px',
        fontFamily: "'Amiri', 'Tajawal', system-ui, serif",
      }}
    >
      {/* Background Texture & Watermark */}
      <div className="absolute inset-0 bg-[#FDFBF7] opacity-100 z-0" />
      <div 
        className="absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Outer Border Design */}
      <div className="absolute inset-6 z-10 border-2 border-[#1E3A8A]" />
      <div className="absolute inset-8 z-10 border-[10px] border-[#0F172A]" />
      <div className="absolute inset-10 z-10 border border-[#D4AF37]" />
      <div className="absolute inset-[46px] z-10 border-2 border-[#D4AF37]" />

      {/* Elegant Corner Ornaments (SVG) */}
      <svg className="absolute top-8 right-8 w-24 h-24 text-[#D4AF37] z-20" viewBox="0 0 100 100" fill="currentColor">
        <path d="M100,0 L0,0 L0,100 C0,44.77 44.77,0 100,0 Z" />
        <path d="M90,5 L5,5 L5,90 C5,43.05 43.05,5 90,5 Z" fill="#FDFBF7" />
        <path d="M85,10 L10,10 L10,85 C10,43.58 43.58,10 85,10 Z" />
      </svg>
      <svg className="absolute top-8 left-8 w-24 h-24 text-[#D4AF37] z-20" viewBox="0 0 100 100" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
        <path d="M100,0 L0,0 L0,100 C0,44.77 44.77,0 100,0 Z" />
        <path d="M90,5 L5,5 L5,90 C5,43.05 43.05,5 90,5 Z" fill="#FDFBF7" />
        <path d="M85,10 L10,10 L10,85 C10,43.58 43.58,10 85,10 Z" />
      </svg>
      <svg className="absolute bottom-8 right-8 w-24 h-24 text-[#D4AF37] z-20" viewBox="0 0 100 100" fill="currentColor" style={{ transform: 'scaleY(-1)' }}>
        <path d="M100,0 L0,0 L0,100 C0,44.77 44.77,0 100,0 Z" />
        <path d="M90,5 L5,5 L5,90 C5,43.05 43.05,5 90,5 Z" fill="#FDFBF7" />
        <path d="M85,10 L10,10 L10,85 C10,43.58 43.58,10 85,10 Z" />
      </svg>
      <svg className="absolute bottom-8 left-8 w-24 h-24 text-[#D4AF37] z-20" viewBox="0 0 100 100" fill="currentColor" style={{ transform: 'scale(-1, -1)' }}>
        <path d="M100,0 L0,0 L0,100 C0,44.77 44.77,0 100,0 Z" />
        <path d="M90,5 L5,5 L5,90 C5,43.05 43.05,5 90,5 Z" fill="#FDFBF7" />
        <path d="M85,10 L10,10 L10,85 C10,43.58 43.58,10 85,10 Z" />
      </svg>

      <div className="relative w-full h-full flex flex-col items-center pt-20 px-24 z-30">
        
        {/* Top Emblem / Logo */}
        <div className="mb-6 flex flex-col items-center">
          <svg className="w-16 h-16 text-[#0F172A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        {/* Title */}
        <div className="text-center mb-10 w-full">
          <h1 className="text-[3.5rem] font-bold text-[#0F172A] mb-4" style={{ fontFamily: "'Amiri', serif" }}>
            شهادة تقدير وتفوق دراسي
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-32 bg-gradient-to-l from-[#D4AF37] to-transparent"></div>
            <p className="text-[1.35rem] text-[#D4AF37] font-semibold tracking-wide">
              تُمنح هذه الشهادة تقديرًا للتميز والإنجاز الأكاديمي
            </p>
            <div className="h-px w-32 bg-gradient-to-r from-[#D4AF37] to-transparent"></div>
          </div>
        </div>

        {/* Presenter Statement */}
        <p className="text-[1.6rem] text-[#334155] mb-8 font-medium">
          يسر الأستاذ <span className="font-bold text-[#0F172A] mx-2 text-[1.8rem]">{data.teacherName}</span> أن يمنح هذه الشهادة إلى {isMale ? 'الطالب' : 'الطالبة'}
        </p>

        {/* Student Name */}
        <div className="relative mb-10 w-full text-center flex flex-col items-center justify-center">
          <h2 className="text-[4.5rem] font-bold text-[#1E3A8A] leading-tight pb-4 px-12 inline-block max-w-[800px] overflow-hidden whitespace-nowrap text-ellipsis" style={{ fontFamily: "'Amiri', serif" }}>
            {data.studentName || 'اسم الطالب'}
          </h2>
          <svg className="w-[600px] h-6 text-[#D4AF37]" viewBox="0 0 600 24" fill="none">
            <path d="M0,12 L280,12 L300,2 L320,12 L600,12" stroke="currentColor" strokeWidth="3" />
            <circle cx="300" cy="12" r="6" fill="currentColor" />
          </svg>
        </div>

        {/* Achievement Paragraph */}
        <div className="max-w-[850px] text-center mb-16 px-8">
          <p className="text-[1.7rem] text-[#1E293B] leading-[1.8] font-medium" style={{ fontFamily: "'Amiri', serif" }}>
            وذلك تقديرًا {getGrammarText1()} العلمي الملحوظ في مادة 
            <span className="font-bold text-[#0F172A] text-[2rem] mx-3 px-3 border-b-2 border-[#D4AF37] inline-block pb-1">{data.subject || '......'}</span>، 
            <br />
            {getGrammarText2()} ومزيدًا من النجاح والتألق.
          </p>
        </div>

        {/* Bottom Metadata & Seals */}
        <div className="w-full flex justify-between items-end px-16 absolute bottom-24 left-0 right-0 z-40">
          
          {/* LEFT: Year Badge */}
          <div className="flex flex-col items-center transform translate-y-2">
            <div className="relative flex items-center justify-center">
              {/* Ribbon tails */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
                <div className="w-6 h-16 bg-[#1E3A8A] transform skew-y-[30deg]"></div>
                <div className="w-6 h-16 bg-[#1E3A8A] transform -skew-y-[30deg]"></div>
              </div>
              {/* Year Medal */}
              <div className="w-[120px] h-[120px] rounded-full border-[6px] border-[#D4AF37] bg-[#0F172A] flex flex-col items-center justify-center text-[#D4AF37] shadow-lg relative z-10">
                <div className="absolute inset-1 rounded-full border border-[#D4AF37] opacity-50 border-dashed"></div>
                <span className="text-sm font-sans tracking-[0.2em] mb-1 opacity-90 uppercase">Year Of</span>
                <span className="text-[1.8rem] font-bold font-sans tracking-wider">{data.year}</span>
              </div>
            </div>
          </div>

          {/* CENTER: Score Seal */}
          <div className="flex flex-col items-center transform -translate-y-8">
            <div className="relative">
              {/* Sunburst / Medal edge */}
              <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] text-[#D4AF37]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0 L55 10 L65 7 L68 18 L79 17 L79 28 L89 31 L86 42 L96 48 L90 57 L98 65 L89 71 L94 81 L83 84 L84 94 L73 93 L69 101 L59 96 L50 103 L41 96 L31 101 L27 93 L16 94 L17 84 L6 81 L11 71 L2 65 L10 57 L4 48 L14 42 L11 31 L21 28 L21 17 L32 18 L35 7 L45 10 Z" />
              </svg>
              {/* Inner Circle */}
              <div className="relative z-10 w-[140px] h-[140px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner border-4 border-[#0F172A]">
                <div className="absolute inset-1 rounded-full border-2 border-[#D4AF37]"></div>
                <span className="text-[3.5rem] font-bold text-[#0F172A] font-sans mt-2">{data.score || '0'}</span>
                <span className="text-lg font-bold text-[#1E3A8A]">درجة</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Date & Signature */}
          <div className="flex gap-16 items-end pb-4">
            <div className="text-center flex flex-col items-center">
              <div className="text-[1.4rem] font-bold text-[#0F172A] font-sans border-b-[2px] border-[#0F172A] pb-3 mb-3 min-w-[180px]" dir="ltr">
                {data.issueDate}
              </div>
              <div className="text-[#64748B] text-[1.1rem] tracking-wide font-medium">التاريخ</div>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="text-[1.8rem] font-bold text-[#1D4ED8] border-b-[2px] border-[#0F172A] pb-2 mb-3 min-w-[200px]" style={{ fontFamily: "'Amiri', serif" }}>
                {data.teacherName}
              </div>
              <div className="text-[#64748B] text-[1.1rem] tracking-wide font-medium">المعلم</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';
