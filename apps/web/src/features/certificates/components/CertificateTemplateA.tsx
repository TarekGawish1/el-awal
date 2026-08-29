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
      className="relative overflow-hidden bg-[#FDFBF7]"
      style={{
        width: '1123px',
        height: '794px',
        fontFamily: "'Amiri', 'Tajawal', system-ui, serif",
      }}
    >
      {/* Outer Border Design */}
      <div className="absolute inset-0 border-[16px] border-[#0A192F]" />
      <div className="absolute inset-5 border-[2px] border-[#C5A059]" />
      <div className="absolute inset-[26px] border-[1px] border-[#C5A059] opacity-70" />

      {/* Decorative Corners */}
      {/* Top Right */}
      <svg className="absolute top-5 right-5 w-48 h-48 text-[#C5A059] opacity-90" viewBox="0 0 200 200" fill="none">
        <path d="M0,0 L200,0 L200,200 C200,89.5 110.5,0 0,0 Z" fill="currentColor" opacity="0.1"/>
        <path d="M20,0 L200,0 L200,180 C200,80.5 119.5,0 20,0 Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40,0 L200,0 L200,160 C200,71.6 128.4,0 40,0 Z" stroke="currentColor" strokeWidth="1"/>
        <path d="M120,0 C120,44.1 155.9,80 200,80" stroke="currentColor" strokeWidth="3"/>
        <circle cx="160" cy="40" r="4" fill="currentColor" />
        <circle cx="180" cy="20" r="3" fill="currentColor" />
        <circle cx="140" cy="15" r="2" fill="currentColor" />
        <circle cx="185" cy="60" r="2" fill="currentColor" />
      </svg>
      {/* Top Left */}
      <svg className="absolute top-5 left-5 w-48 h-48 text-[#C5A059] opacity-90 transform -scale-x-100" viewBox="0 0 200 200" fill="none">
        <path d="M0,0 L200,0 L200,200 C200,89.5 110.5,0 0,0 Z" fill="currentColor" opacity="0.1"/>
        <path d="M20,0 L200,0 L200,180 C200,80.5 119.5,0 20,0 Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40,0 L200,0 L200,160 C200,71.6 128.4,0 40,0 Z" stroke="currentColor" strokeWidth="1"/>
        <path d="M120,0 C120,44.1 155.9,80 200,80" stroke="currentColor" strokeWidth="3"/>
        <circle cx="160" cy="40" r="4" fill="currentColor" />
        <circle cx="180" cy="20" r="3" fill="currentColor" />
        <circle cx="140" cy="15" r="2" fill="currentColor" />
        <circle cx="185" cy="60" r="2" fill="currentColor" />
      </svg>
      {/* Bottom Right */}
      <svg className="absolute bottom-5 right-5 w-48 h-48 text-[#C5A059] opacity-90 transform -scale-y-100" viewBox="0 0 200 200" fill="none">
        <path d="M0,0 L200,0 L200,200 C200,89.5 110.5,0 0,0 Z" fill="currentColor" opacity="0.1"/>
        <path d="M20,0 L200,0 L200,180 C200,80.5 119.5,0 20,0 Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40,0 L200,0 L200,160 C200,71.6 128.4,0 40,0 Z" stroke="currentColor" strokeWidth="1"/>
        <path d="M120,0 C120,44.1 155.9,80 200,80" stroke="currentColor" strokeWidth="3"/>
        <circle cx="160" cy="40" r="4" fill="currentColor" />
        <circle cx="180" cy="20" r="3" fill="currentColor" />
        <circle cx="140" cy="15" r="2" fill="currentColor" />
        <circle cx="185" cy="60" r="2" fill="currentColor" />
      </svg>
      {/* Bottom Left */}
      <svg className="absolute bottom-5 left-5 w-48 h-48 text-[#C5A059] opacity-90 transform -scale-x-100 -scale-y-100" viewBox="0 0 200 200" fill="none">
        <path d="M0,0 L200,0 L200,200 C200,89.5 110.5,0 0,0 Z" fill="currentColor" opacity="0.1"/>
        <path d="M20,0 L200,0 L200,180 C200,80.5 119.5,0 20,0 Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M40,0 L200,0 L200,160 C200,71.6 128.4,0 40,0 Z" stroke="currentColor" strokeWidth="1"/>
        <path d="M120,0 C120,44.1 155.9,80 200,80" stroke="currentColor" strokeWidth="3"/>
        <circle cx="160" cy="40" r="4" fill="currentColor" />
        <circle cx="180" cy="20" r="3" fill="currentColor" />
        <circle cx="140" cy="15" r="2" fill="currentColor" />
        <circle cx="185" cy="60" r="2" fill="currentColor" />
      </svg>

      <div className="relative w-full h-full flex flex-col items-center pt-10 px-16 z-30">
        
        {/* Top Emblem */}
        <div className="mb-4 flex flex-col items-center">
          <svg className="w-20 h-20 text-[#C5A059]" viewBox="0 0 100 100" fill="none">
            {/* Wreath */}
            <path d="M20,50 C20,20 40,10 50,10 C60,10 80,20 80,50 C80,80 60,90 50,90 C40,90 20,80 20,50 Z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/>
            {/* Cap */}
            <path d="M30,40 L50,30 L70,40 L50,50 Z" fill="#0A192F" />
            <path d="M35,45 L35,55 C35,60 65,60 65,55 L65,45" fill="none" stroke="#0A192F" strokeWidth="3"/>
            {/* Book */}
            <path d="M40,65 L50,70 L60,65 L60,55 L50,60 L40,55 Z" fill="#0A192F" />
            <circle cx="50" cy="20" r="2" fill="currentColor"/>
            <circle cx="30" cy="30" r="1.5" fill="currentColor"/>
            <circle cx="70" cy="30" r="1.5" fill="currentColor"/>
            <circle cx="20" cy="50" r="1.5" fill="currentColor"/>
            <circle cx="80" cy="50" r="1.5" fill="currentColor"/>
            <circle cx="30" cy="70" r="1.5" fill="currentColor"/>
            <circle cx="70" cy="70" r="1.5" fill="currentColor"/>
          </svg>
        </div>

        {/* Title */}
        <div className="text-center mb-5 w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-6 mb-2">
            {/* Left Ornament */}
            <svg className="w-16 h-6 text-[#C5A059]" viewBox="0 0 50 20" fill="currentColor">
              <path d="M0,10 C15,10 20,0 25,0 C30,0 35,10 50,10 C35,10 30,20 25,20 C20,20 15,10 0,10 Z" />
            </svg>
            <h1 className="text-[3rem] font-bold text-[#0A192F]" style={{ fontFamily: "'Amiri', serif" }}>
              شهادة تقدير وتفوق دراسي
            </h1>
            {/* Right Ornament */}
            <svg className="w-16 h-6 text-[#C5A059]" viewBox="0 0 50 20" fill="currentColor">
              <path d="M0,10 C15,10 20,0 25,0 C30,0 35,10 50,10 C35,10 30,20 25,20 C20,20 15,10 0,10 Z" />
            </svg>
          </div>
          
          <div className="flex items-center justify-center w-full">
            <div className="h-px w-[200px] bg-gradient-to-l from-[#C5A059] to-transparent opacity-50"></div>
            <p className="text-[1.2rem] text-[#C5A059] font-bold tracking-wide mx-6">
              تُمنح هذه الشهادة تقديرًا للتميز والإنجاز الأكاديمي
            </p>
            <div className="h-px w-[200px] bg-gradient-to-r from-[#C5A059] to-transparent opacity-50"></div>
          </div>
        </div>

        {/* Presenter Statement */}
        <p className="text-[1.4rem] text-[#334155] mb-5 font-medium">
          يسر الأستاذ <span className="font-bold text-[#0A192F] mx-2 text-[1.5rem]">{data.teacherName}</span> أن يمنح هذه الشهادة إلى
        </p>

        {/* Student Name */}
        <div className="relative mb-6 w-full text-center flex flex-col items-center justify-center">
          <h2 className="text-[3.5rem] font-bold text-[#1D4ED8] pb-3 px-12 max-w-[900px] leading-tight" style={{ fontFamily: "'Amiri', serif" }}>
            {data.studentName || 'اسم الطالب'}
          </h2>
          {/* Elegant Divider */}
          <svg className="w-[500px] h-6 text-[#C5A059]" viewBox="0 0 500 24" fill="none">
            <path d="M0,12 L230,12" stroke="currentColor" strokeWidth="1.5" />
            <path d="M270,12 L500,12" stroke="currentColor" strokeWidth="1.5" />
            <path d="M250,4 L242,12 L250,20 L258,12 Z" fill="currentColor" />
            <circle cx="230" cy="12" r="2" fill="currentColor" />
            <circle cx="270" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Achievement Paragraph */}
        <div className="max-w-[750px] text-center">
          <p className="text-[1.4rem] text-[#1E293B] leading-[1.8] font-medium" style={{ fontFamily: "'Amiri', serif" }}>
            وذلك تقديرًا {getGrammarText1()} العلمي الملحوظ في مادة 
            <span className="font-bold text-[#0A192F] text-[1.6rem] mx-2">{data.subject || '......'}</span>، 
            متمنيًا {isMale ? 'له' : 'لها'} مستقبلًا واعدًا ومزيدًا من النجاح والتألق.
          </p>
        </div>

        {/* Bottom Section - Perfectly balanced grid */}
        <div className="w-full grid grid-cols-4 items-end px-12 mt-auto pb-10">
          
          {/* 1. Year Badge (Left) */}
          <div className="col-span-1 flex justify-center relative">
            <div className="relative flex flex-col items-center justify-center">
              {/* Hanging Ribbons */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-1 z-0">
                <div className="w-8 h-24 bg-[#0A192F] transform rotate-12 origin-top">
                  <div className="absolute bottom-0 left-0 w-full h-4 bg-[#FDFBF7]" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
                </div>
                <div className="w-8 h-24 bg-[#0A192F] transform -rotate-12 origin-top">
                  <div className="absolute bottom-0 left-0 w-full h-4 bg-[#FDFBF7]" style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
                </div>
              </div>
              {/* Jagged Seal */}
              <svg className="w-[120px] h-[120px] text-[#C5A059] relative z-10 drop-shadow-md" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50,2 L55,10 L65,8 L68,18 L78,18 L80,28 L89,31 L88,41 L97,46 L92,55 L99,62 L91,69 L95,78 L85,82 L85,92 L75,93 L71,102 L61,98 L55,106 L45,106 L39,98 L29,102 L25,93 L15,92 L15,82 L5,78 L9,69 L1,62 L8,55 L3,46 L12,41 L11,31 L20,28 L22,18 L32,18 L35,8 L45,10 Z" />
                <circle cx="50" cy="54" r="38" fill="#0A192F" />
                <circle cx="50" cy="54" r="34" fill="none" stroke="#C5A059" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
              {/* Text inside Year Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center mt-1">
                <span className="text-[0.75rem] font-sans text-[#C5A059] tracking-widest uppercase">Year Of</span>
                <span className="text-[1.8rem] font-bold font-sans text-[#C5A059] leading-none mt-1">{data.year}</span>
                <div className="flex gap-1 mt-1">
                  <span className="text-[#C5A059] text-[0.5rem]">★</span>
                  <span className="text-[#C5A059] text-[0.6rem]">★</span>
                  <span className="text-[#C5A059] text-[0.5rem]">★</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Date */}
          <div className="col-span-1 flex flex-col items-center justify-end h-[120px] pb-6">
            <svg className="w-8 h-8 text-[#C5A059] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M9 16l2 2 4-4"></path>
            </svg>
            <div className="text-[1.2rem] font-bold text-[#0A192F] font-sans border-b border-[#C5A059] pb-2 min-w-[150px] text-center mb-2" dir="ltr">
              {data.issueDate}
            </div>
            <div className="text-[#64748B] text-[1.1rem]">التاريخ</div>
          </div>

          {/* 3. Score Seal (Center-Right) */}
          <div className="col-span-1 flex justify-center">
            <div className="relative flex items-center justify-center">
              {/* Laurel Wreath */}
              <svg className="absolute w-[180px] h-[180px] text-[#C5A059] z-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20,80 C10,50 30,20 50,15 C70,20 90,50 80,80" strokeDasharray="3 3"/>
                <path d="M50,10 L55,20 L45,20 Z" fill="currentColor" stroke="none" />
                <path d="M20,80 L25,70 L15,70 Z" fill="currentColor" stroke="none" />
                <path d="M80,80 L85,70 L75,70 Z" fill="currentColor" stroke="none" />
              </svg>
              {/* Inner Circle */}
              <div className="relative z-10 w-[130px] h-[130px] rounded-full border-[3px] border-[#C5A059] bg-[#FDFBF7] flex flex-col items-center justify-center shadow-lg">
                <div className="absolute inset-2 rounded-full border-[1px] border-[#C5A059] border-dashed"></div>
                <div className="flex gap-1 absolute top-3 text-[#C5A059] text-xs">
                  <span>★</span><span>★</span><span>★</span>
                </div>
                <span className="text-[3rem] font-bold text-[#0A192F] font-sans leading-none mt-2">{data.score || '0'}</span>
                <span className="text-[1.2rem] font-bold text-[#1D4ED8] mt-1" style={{ fontFamily: "'Amiri', serif" }}>درجة</span>
                <div className="flex gap-1 absolute bottom-3 text-[#C5A059] text-xs">
                  <span>★</span><span>★</span><span>★</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Teacher Signature (Right) */}
          <div className="col-span-1 flex flex-col items-center justify-end h-[120px] pb-6">
            <div className="text-[2rem] font-bold text-[#1D4ED8] mb-1" style={{ fontFamily: "'Qwigley', 'Amiri', cursive", transform: 'rotate(-5deg)' }}>
              {data.teacherName}
            </div>
            <div className="w-[180px] h-px bg-[#0A192F] mb-2 opacity-60"></div>
            <div className="text-[1.2rem] font-bold text-[#0A192F] font-sans mb-1">{data.teacherName}</div>
            <div className="text-[#64748B] text-[1.1rem]">المعلم</div>
          </div>

        </div>

      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';

