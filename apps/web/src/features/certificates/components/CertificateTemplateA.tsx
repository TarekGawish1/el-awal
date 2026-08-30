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
  const studentTitle = isMale ? 'الطالب' : 'الطالبة';

  return (
    <div
      ref={ref}
      dir="rtl"
      className="relative overflow-hidden bg-center bg-no-repeat bg-cover"
      style={{
        width: '1146px', // from SVG viewBox
        height: '810px',
        backgroundImage: "url('/certification-bg.svg')",
        fontFamily: "'Amiri', 'Tajawal', system-ui, serif",
      }}
    >
      <div 
        className="absolute w-full flex flex-col items-center justify-center gap-6"
        style={{ top: '350px' }} // Adjusted higher
      >
        {/* Presenter Sentence */}
        <p className="text-[2.2rem] text-[#4A4A4A] font-bold" style={{ fontFamily: "'Amiri', serif" }}>
          يسر الأستاذ {data.teacherName} أن يمنح هذه الشهادة إلى {studentTitle}
        </p>

        {/* Student Name */}
        <h2 
          className="text-[4rem] font-bold pb-3 px-12 max-w-[900px] leading-tight" 
          style={{ 
            fontFamily: "'Amiri', serif",
            color: '#1D4ED8' // Blue color
          }}
        >
          {data.studentName || 'اسم الطالب'}
        </h2>
      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';

