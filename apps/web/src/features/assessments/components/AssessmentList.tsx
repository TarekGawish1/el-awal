'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { useAssessments } from '../hooks/use-assessments';
import { AssessmentCard } from './AssessmentCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

export function AssessmentList() {
  const { data, isLoading, isError, error, refetch } = useAssessments();
  const [searchQuery, setSearchQuery] = useState('');

  const assessments = data?.data || [];
  
  const filteredAssessments = assessments.filter(assessment => 
    assessment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الاختبارات والواجبات</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وإدارة امتحاناتك وتقييم طلابك</p>
        </div>
        <Link href="/teacher/assessments/new">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            اختبار جديد
          </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن اختبار..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
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
          {[1, 2, 3, 4, 5, 6].map(i => (
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
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد اختبارات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم بإنشاء اختبارك الأول لتبدأ في تقييم طلابك ومتابعة مستواهم الدراسي.
          </p>
          <Link href="/teacher/assessments/new">
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إنشاء اختبارك الأول
            </Button>
          </Link>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">لم يتم العثور على اختبارات تطابق بحثك "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map(assessment => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      )}
    </div>
  );
}
