'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Award, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface SavedCertificate {
  id: string;
  studentName: string;
  subject: string;
  score: string;
  stage: string;
  grade: string;
  issueDate: string;
  createdAt: string;
  data?: any;
}

export function CertificatesClient() {
  const [certificates, setCertificates] = useState<SavedCertificate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_certificates') || '[]');
      setCertificates(saved);
    } catch (err) {
      console.error('Error parsing certificates from localStorage:', err);
    }
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الشهادة؟')) {
      const updated = certificates.filter(cert => cert.id !== id);
      setCertificates(updated);
      localStorage.setItem('saved_certificates', JSON.stringify(updated));
    }
  };

  const filteredCertificates = certificates.filter(cert => 
    cert.studentName?.includes(searchTerm) || 
    cert.subject?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الشهادات</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وإدارة شهادات التقدير لطلابك</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/teacher/certificates/new" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء شهادة
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن اسم الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد شهادات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم بإنشاء شهادتك الأولى لتبدأ في تقدير طلابك المتميزين وتشجيعهم.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/teacher/certificates/new">
              <Button variant="primary">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء شهادة جديدة
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">جرب البحث بكلمات مختلفة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map(cert => (
            <Card key={cert.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {cert.data?.image || (cert as any).image ? (
                <div className="relative w-full aspect-[1.41] bg-slate-100 border-b border-slate-100">
                  <img 
                    src={cert.data?.image || (cert as any).image} 
                    alt={`شهادة ${cert.studentName}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {cert.issueDate}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{cert.studentName}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 flex-wrap">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{cert.subject}</span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs">{cert.score} درجة</span>
                </div>
                <div className="mt-auto flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-4">
                  <span>{cert.stage} - {cert.grade}</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDelete(cert.id)}
                      className="text-red-500 hover:text-red-700 font-medium hover:underline text-xs"
                    >
                      حذف
                    </button>
                    {cert.data?.image || (cert as any).image ? (
                      <a 
                        href={cert.data?.image || (cert as any).image} 
                        download={`شهادة-${cert.studentName}.png`}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-xs"
                      >
                        تحميل
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
