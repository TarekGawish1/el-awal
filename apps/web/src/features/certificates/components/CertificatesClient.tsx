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
  const [selectedStage, setSelectedStage] = useState('الكل');

  useEffect(() => {
    const fetchAndMergeCertificates = async () => {
      let localCerts: any[] = [];
      try {
        localCerts = JSON.parse(localStorage.getItem('saved_certificates') || '[]');
      } catch (err) {
        console.error('Error parsing certificates from localStorage:', err);
      }

      let apiCerts: any[] = [];
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${baseUrl}/certificates/public`);
        if (res.ok) {
          const json = await res.json();
          apiCerts = json?.data || json || [];
        }
      } catch (err) {
        console.error('Error fetching API certificates:', err);
      }

      const mappedApiCerts = apiCerts.map((c: any) => ({
        id: c.id,
        studentName: c.studentName,
        subject: c.subject,
        score: c.score,
        stage: c.stage,
        grade: c.grade,
        issueDate: c.issueDate,
        createdAt: c.createdAt,
        image: c.fileUrl,
      }));

      // Filter out local certificates that are already present in the API
      const nonDuplicateLocalCerts = localCerts.filter((local: any) => {
        return !mappedApiCerts.some((api: any) =>
          api.id === local.id ||
          (api.studentName?.trim() === local.studentName?.trim() && api.subject?.trim() === local.subject?.trim())
        );
      });

      // Keep localStorage clean of redundant duplicates
      if (nonDuplicateLocalCerts.length !== localCerts.length) {
        try {
          localStorage.setItem('saved_certificates', JSON.stringify(nonDuplicateLocalCerts));
        } catch (e) {
          console.warn('Could not update localStorage', e);
        }
      }

      const combined = [...mappedApiCerts, ...nonDuplicateLocalCerts];
      
      // Deduplicate by studentName + subject + stage to guarantee single appearance
      const seen = new Set<string>();
      const uniqueSaved: any[] = [];
      for (const item of combined) {
        const key = `${item.studentName?.trim()}_${item.subject?.trim()}_${item.stage?.trim()}`;
        if (!seen.has(key) && !seen.has(item.id)) {
          seen.add(key);
          seen.add(item.id);
          uniqueSaved.push(item);
        }
      }
      
      // Sort by creation date (newest first)
      uniqueSaved.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setCertificates(uniqueSaved as SavedCertificate[]);
    };

    fetchAndMergeCertificates();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الشهادة؟')) {
      const updated = certificates.filter(cert => cert.id !== id);
      setCertificates(updated);
      localStorage.setItem('saved_certificates', JSON.stringify(updated));
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        await fetch(`${baseUrl}/certificates/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete certificate from backend:', err);
      }
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.studentName?.includes(searchTerm) || cert.subject?.includes(searchTerm);
    const matchesStage = selectedStage === 'الكل' || cert.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const stages = ['الكل', 'الثانوية', 'الإعدادية', 'الابتدائية'];

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
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {stages.map(stage => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedStage === stage 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
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
          <Link href="/teacher/certificates/new">
            <Card className="h-full min-h-[300px] border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 group">
              <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">إنشاء شهادة جديدة</h3>
              <p className="text-sm mt-2 text-center px-4 opacity-70">
                اضغط هنا لتصميم وإصدار شهادة تقدير جديدة لطلابك
              </p>
            </Card>
          </Link>
          
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
                    {(cert.data?.image || (cert as any).image) ? (
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
