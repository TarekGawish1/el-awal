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
      className="relative bg-[#FDFDFD] overflow-hidden"
      style={{
        width: '1123px',
        height: '794px',
        fontFamily: "'Amiri', 'Tajawal', system-ui, sans-serif",
      }}
    >
      {/* Outer Border (Navy & Gold Double Border) */}
      <div className="absolute inset-4 border-[12px] border-[#0F172A] p-2">
        <div className="absolute inset-0 border-[4px] border-[#D4AF37] m-1" />
      </div>

      {/* Decorative Corners */}
      <div className="absolute top-8 right-8 w-24 h-24 border-t-4 border-r-4 border-[#D4AF37] opacity-60" />
      <div className="absolute top-8 left-8 w-24 h-24 border-t-4 border-l-4 border-[#D4AF37] opacity-60" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-b-4 border-r-4 border-[#D4AF37] opacity-60" />
      <div className="absolute bottom-8 left-8 w-24 h-24 border-b-4 border-l-4 border-[#D4AF37] opacity-60" />

      <div className="relative w-full h-full flex flex-col items-center pt-24 px-24">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-6xl font-bold text-[#0F172A] tracking-wider font-serif">
            شهادة تقدير وتفوق دراسي
          </h1>
          <p className="text-xl text-[#334155] font-medium">
            تُمنح هذه الشهادة تقديرًا للتميز والإنجاز الأكاديمي
          </p>
        </div>

        {/* Teacher Statement */}
        <p className="text-2xl text-[#1E293B] mb-8">
          يسر الأستاذ <span className="font-bold text-[#0F172A]">{data.teacherName}</span> أن يمنح هذه الشهادة إلى {isMale ? 'الطالب' : 'الطالبة'}
        </p>

        {/* Student Name */}
        <div className="relative mb-12 w-full text-center">
          <h2 className="text-7xl font-bold text-[#1D4ED8] pb-6 px-12 inline-block max-w-[800px] overflow-hidden whitespace-nowrap text-ellipsis border-b-4 border-[#D4AF37]">
            {data.studentName || 'اسم الطالب'}
          </h2>
        </div>

        {/* Achievement Description */}
        <p className="text-2xl text-[#1E293B] max-w-4xl text-center leading-loose mb-16">
          وذلك تقديرًا {getGrammarText1()} العلمي الملحوظ في مادة <span className="font-bold text-[#0F172A] text-3xl mx-2">{data.subject || '......'}</span>، 
          {getGrammarText2()} ومزيدًا من النجاح والتألق.
        </p>

        {/* Bottom Section */}
        <div className="w-full flex justify-between items-end px-12 absolute bottom-20 left-0 right-0">
          
          {/* Year Badge */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-4 border-[#D4AF37] bg-[#0F172A] flex flex-col items-center justify-center text-[#D4AF37] shadow-xl relative">
              <span className="text-xs uppercase tracking-widest mb-1 opacity-80 font-sans">Year Of</span>
              <span className="text-3xl font-bold font-sans">{data.year}</span>
            </div>
          </div>

          {/* Date & Signature */}
          <div className="flex gap-32">
            <div className="text-center">
              <div className="text-xl font-bold text-[#0F172A] border-b-2 border-[#94A3B8] pb-2 mb-2 min-w-[200px]" dir="ltr">
                {data.issueDate}
              </div>
              <div className="text-[#64748B] text-lg">التاريخ</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-[#1D4ED8] font-serif border-b-2 border-[#94A3B8] pb-2 mb-2 min-w-[200px]">
                {data.teacherName}
              </div>
              <div className="text-[#64748B] text-lg">المعلم</div>
            </div>
          </div>

          {/* Score Badge */}
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 rounded-full border-8 border-[#D4AF37] bg-[#FDF8F0] flex flex-col items-center justify-center text-[#0F172A] shadow-2xl relative">
              {/* Outer decorative stars */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              
              <span className="text-6xl font-bold mt-2">{data.score || '0'}</span>
              <span className="text-lg font-bold text-[#D4AF37] mt-1">درجة</span>
            </div>
          </div>

        </div>
        
        {/* Platform Branding */}
        <div className="absolute bottom-6 text-[#94A3B8] text-sm font-sans tracking-wider">
          منصة الأول التعليمية | AL-AWAL EDUCATIONAL PLATFORM
        </div>

      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';
