'use client';

import { useState } from 'react';
import { Plus, Search, Layers, AlertCircle, BookOpen } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Group } from '../types/groups.types';

const STAGE_ORDER = ['المرحلة الابتدائية', 'المرحلة الإعدادية', 'المرحلة الثانوية', 'أخرى'];

const getStageName = (gradeLevel: string) => {
  if (!gradeLevel) return 'أخرى';
  if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

export function GroupList() {
  const { data: groups, isLoading, isError, error, refetch } = useGroups();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groups?.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (group.gradeLevel && group.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Group by stage and then by grade
  const groupedGroups = filteredGroups.reduce((acc, group) => {
    const stage = getStageName(group.gradeLevel);
    if (!acc[stage]) acc[stage] = {};
    if (!acc[stage][group.gradeLevel]) acc[stage][group.gradeLevel] = [];
    acc[stage][group.gradeLevel].push(group);
    return acc;
  }, {} as Record<string, Record<string, Group[]>>);

  // Sort stages
  const sortedStages = Object.keys(groupedGroups).sort(
    (a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المجموعات</h1>
          <p className="text-slate-500 mt-1">إدارة مجموعاتك الدراسية والطلاب المسجلين بها</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          مجموعة جديدة
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن مجموعة بالاسم أو الصف..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل المجموعات</p>
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
      ) : groups?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد مجموعات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم بإنشاء مجموعتك الأولى لتبدأ في إدارة الطلاب وتسجيل الحضور والغياب.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء مجموعتك الأولى
          </Button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">لم يتم العثور على مجموعات تطابق بحثك "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedStages.map(stage => (
            <div key={stage} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{stage}</h2>
              </div>
              
              <div className="space-y-8">
                {Object.keys(groupedGroups[stage]).sort().map(grade => (
                  <div key={grade}>
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary-500 ml-2"></div>
                      {grade || 'بدون صف'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedGroups[stage][grade].map(group => (
                        <GroupCard key={group.id} group={group} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateGroupModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
