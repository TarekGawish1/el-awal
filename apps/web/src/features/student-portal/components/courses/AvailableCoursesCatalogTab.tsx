'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { Skeleton } from '@/components/ui/Skeleton';
import { CourseSubscriptionModal } from '@/features/student-portal/components/CourseSubscriptionModal';
import { AvailableCourseCard } from './AvailableCourseCard';
import { Search, Compass } from 'lucide-react';

export interface AvailableCoursesCatalogTabProps {
  studentGradeLevel?: string;
  studentAcademicStage?: string;
  myCourses?: any[];
  onViewCertificate?: (course: { title: string; teacherName?: string }) => void;
  onWatchPreview?: (course: { title: string; videoUrl: string; teacherName?: string }) => void;
}

export function AvailableCoursesCatalogTab({
  studentGradeLevel,
  studentAcademicStage,
  myCourses = [],
  onViewCertificate,
  onWatchPreview,
}: AvailableCoursesCatalogTabProps) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      setIsLoading(true);
      try {
        const baseUrl = API_BASE_URL;
        const url = `${baseUrl}/courses/catalog?limit=50`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch published catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  const filteredCatalog = catalog.filter((c: any) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.gradeLevel && c.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage =
      selectedStage === 'ALL' ||
      (selectedStage === 'MY_GRADE' && c.gradeLevel === studentGradeLevel) ||
      c.academicStage === selectedStage;

    return matchesSearch && matchesStage;
  });

  const handleEnroll = (course: any) => {
    setSelectedCourseForSub(course);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث عن دورة أو مادة أو معلم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-right"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedStage('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === 'ALL'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({catalog.length})
          </button>
          {studentGradeLevel && (
            <button
              type="button"
              onClick={() => setSelectedStage('MY_GRADE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedStage === 'MY_GRADE'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              صفي الدراسي ({studentGradeLevel})
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedStage('PRIMARY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === 'PRIMARY'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الابتدائية
          </button>
          <button
            type="button"
            onClick={() => setSelectedStage('PREPARATORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === 'PREPARATORY'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الإعدادية
          </button>
          <button
            type="button"
            onClick={() => setSelectedStage('SECONDARY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === 'SECONDARY'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الثانوية
          </button>
        </div>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700">
            لا توجد دورات تطابق البحث
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            جرب البحث بكلمات أخرى أو اختر تصفية مختلفة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.map((c: any, index: number) => (
            <AvailableCourseCard
              key={c.id}
              course={c}
              index={index}
              myCourses={myCourses}
              onViewCertificate={onViewCertificate}
              onWatchPreview={onWatchPreview}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      )}

      {selectedCourseForSub && (
        <CourseSubscriptionModal
          isOpen={!!selectedCourseForSub}
          onClose={() => setSelectedCourseForSub(null)}
          course={{
            id: selectedCourseForSub.id,
            title: selectedCourseForSub.title,
            price: selectedCourseForSub.price,
            teacherName:
              selectedCourseForSub.teacher?.user?.fullName ||
              selectedCourseForSub.teacherName,
            teacherPhone: selectedCourseForSub.teacher?.user?.phone,
            subject: selectedCourseForSub.subject,
            gradeLevel: selectedCourseForSub.gradeLevel,
          }}
        />
      )}
    </div>
  );
}
