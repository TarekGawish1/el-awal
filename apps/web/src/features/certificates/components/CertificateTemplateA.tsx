import React, { forwardRef } from 'react';

export interface CertificateData {
  studentName: string;
  gender: 'MALE' | 'FEMALE';
  subject: string;
  score: string;
  issueDate: string;
  year: string;
  teacherName: string;
  yearPos: { x: number, y: number };
  scorePos: { x: number, y: number };
  datePos: { x: number, y: number };
}

interface Props {
  data: CertificateData;
}

export const CertificateTemplateA = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const isMale = data.gender === 'MALE';
  const studentTitle = isMale ? 'الطالب' : 'الطالبة';
  const getGrammarText1 = () => isMale ? 'لأدائه المتميز وتفوقه' : 'لأدائها المتميز وتفوقها';
  const getGrammarText2 = () => isMale ? 'متمنيًا له' : 'متمنيًا لها';

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
        className="absolute w-full flex flex-col items-center justify-center gap-4"
        style={{ top: '230px' }} // Adjusted much higher
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

        {/* Achievement Paragraph */}
        <div className="max-w-[850px] text-center mt-4">
          <p className="text-[1.8rem] text-[#4A4A4A] leading-[1.8] font-bold" style={{ fontFamily: "'Amiri', serif" }}>
            وذلك تقديرًا {getGrammarText1()} العلمي الملحوظ في مادة 
            <span className="text-[#1D4ED8] mx-2">{data.subject || '......'}</span>، 
            {getGrammarText2()} مستقبلًا واعدًا ومزيدًا من النجاح والتألق.
          </p>
        </div>
      </div>

      {/* Score / Grade (Placed over the gold seal) */}
      <div 
        className="absolute flex flex-col items-center justify-center"
        style={{ 
          top: `${data.scorePos?.y || 640}px`,
          left: `${data.scorePos?.x || 573}px`, // 573 is approx 50% of 1146
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px'
        }}
      >
        <span className="text-[3.5rem] font-bold text-[#0A192F] leading-none" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {data.score || '0'}
        </span>
      </div>

      {/* Year (Placed in the red ribbon seal) */}
      <div 
        className="absolute flex flex-col items-center justify-center"
        style={{ 
          top: `${data.yearPos?.y || 540}px`,
          left: `${data.yearPos?.x || 200}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span className="text-[1.8rem] font-bold text-[#0A192F] leading-none" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {data.year}
        </span>
      </div>

      {/* Date (Placed above the horizontal line) */}
      <div 
        className="absolute flex flex-col items-center justify-center"
        style={{ 
          top: `${data.datePos?.y || 620}px`,
          left: `${data.datePos?.x || 388}px`,
          transform: 'translate(-50%, -50%)',
        }}
        dir="ltr"
      >
        <span className="text-[1.5rem] font-bold text-[#4A4A4A] leading-none" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {data.issueDate}
        </span>
      </div>
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';

