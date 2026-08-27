'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { useAssessments } from '../hooks/use-assessments';
import { AssessmentCard } from './AssessmentCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 9;

export function AssessmentList() {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch } = useAssessments();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'ASSIGNMENT'>('ALL');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const assessments = data?.data || [];

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || assessment.type === filterType;
      const matchesStage = filterStage === 'ALL' || assessment.academicStage === filterStage;
      const matchesGrade = filterGrade === 'ALL' || assessment.gradeLevel === filterGrade;
      return matchesSearch && matchesType && matchesStage && matchesGrade;
    });
  }, [assessments, searchQuery, filterType, filterStage, filterGrade]);

  const availableStages = ['PRIMARY', 'MIDDLE', 'SECONDARY'];

  const availableGrades = useMemo(() => {
    if (filterStage === 'PRIMARY') return ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'];
    if (filterStage === 'MIDDLE') return ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'];
    if (filterStage === 'SECONDARY') return ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'];
    
    // If 'ALL' is selected, show grades dynamically from the existing ones, or just all grades
    const grades = new Set<string>();
    assessments.forEach(a => {
      if (a.gradeLevel) grades.add(a.gradeLevel);
    });
    return Array.from(grades);
  }, [assessments, filterStage]);

  const totalPages = Math.ceil(filteredAssessments.length / PAGE_SIZE);

  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssessments.slice(start, start + PAGE_SIZE);
  }, [filteredAssessments, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (type: 'ALL' | 'EXAM' | 'ASSIGNMENT') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleStageChange = (val: string) => {
    setFilterStage(val);
    setFilterGrade('ALL'); // Reset grade when stage changes
    setCurrentPage(1);
  };

  const handleGradeChange = (val: string) => {
    setFilterGrade(val);
    setCurrentPage(1);
  };

  const formatStageName = (stage: string) => {
    switch(stage) {
      case 'PRIMARY': return 'ابتدائي';
      case 'MIDDLE': return 'إعدادي';
      case 'SECONDARY': return 'ثانوي';
      default: return stage;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الاختبارات والواجبات</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وإدارة امتحاناتك وتقييم طلابك</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isOnline ? (
            <Link href="/teacher/assessments/new?type=EXAM" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 ml-2" />
                اختبار جديد
              </Button>
            </Link>
          ) : (
            <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto" disabled>
                <Plus className="w-4 h-4 ml-2" />
                اختبار جديد
              </Button>
            </span>
          )}
          {isOnline ? (
            <Link href="/teacher/assessments/new?type=ASSIGNMENT" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white">
                <Plus className="w-4 h-4 ml-2" />
                واجب جديد
              </Button>
            </Link>
          ) : (
            <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white" disabled>
                <Plus className="w-4 h-4 ml-2" />
                واجب جديد
              </Button>
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن اختبار أو واجب..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {availableStages.length > 0 && (
            <Select
              className="w-full md:w-40 bg-slate-50 border-slate-200"
              value={filterStage}
              onChange={(e) => handleStageChange(e.target.value)}
              options={[
                { label: 'كل المراحل', value: 'ALL' },
                ...availableStages.map(stage => ({ label: formatStageName(stage), value: stage }))
              ]}
            />
          )}

          {availableGrades.length > 0 && (
            <Select
              className="w-full md:w-48 bg-slate-50 border-slate-200"
              value={filterGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              options={[
                { label: 'كل الصفوف', value: 'ALL' },
                ...availableGrades.map(grade => ({ label: grade, value: grade }))
              ]}
            />
          )}
        </div>

        {/* Filter Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full md:w-auto shadow-xs border border-slate-200/50">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'EXAM', label: 'الامتحانات' },
            { id: 'ASSIGNMENT', label: 'الواجبات' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterTypeChange(tab.id as 'ALL' | 'EXAM' | 'ASSIGNMENT')}
              className={`flex-1 md:flex-initial py-1.5 px-5 rounded-lg font-bold text-xs transition-all ${
                filterType === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل الاختبارات</p>
            <p className="text-sm opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 h-48 flex flex-col">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-auto" />
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد اختبارات أو واجبات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم بإنشاء اختبارك أو واجبك الأول لتبدأ في تقييم طلابك ومتابعة مستواهم الدراسي.
          </p>
          <div className="flex justify-center gap-3">
            {isOnline ? (
              <Link href="/teacher/assessments/new?type=EXAM">
                <Button variant="primary">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء اختبار جديد
                </Button>
              </Link>
            ) : (
              <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت">
                <Button variant="primary" disabled>
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء اختبار جديد
                </Button>
              </span>
            )}
            {isOnline ? (
              <Link href="/teacher/assessments/new?type=ASSIGNMENT">
                <Button variant="outline" className="bg-white">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء واجب جديد
                </Button>
              </Link>
            ) : (
              <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت">
                <Button variant="outline" className="bg-white" disabled>
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء واجب جديد
                </Button>
              </span>
            )}
          </div>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">لم يتم العثور على نتائج تطابق خيارات البحث الحالية.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>

          {/* Pagination Component */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAssessments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="اختبار/واجب"
            />
          )}
        </div>
      )}
    </div>
  );
}
