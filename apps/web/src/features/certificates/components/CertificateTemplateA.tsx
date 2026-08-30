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
    </div>
  );
});

CertificateTemplateA.displayName = 'CertificateTemplateA';

