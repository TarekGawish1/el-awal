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
      {/* Student Name Overlay */}
      <div 
        className="absolute w-full text-center flex flex-col items-center justify-center"
        style={{ top: '430px' }} // Approximate position, we will adjust this
      >
        <h2 
          className="text-[3.5rem] font-bold pb-3 px-12 max-w-[900px] leading-tight" 
          style={{ 
            fontFamily: "'Amiri', serif",
            color: '#1D4ED8' // We can change this to match the preferred color
          }}
        >
          {data.studentName || 'اسم الطالب'}
        </h2>
      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';

