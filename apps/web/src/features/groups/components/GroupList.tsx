'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Layers, AlertCircle, BookOpen, Calendar, Link2, Search, RotateCcw } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupDetailsModal } from './GroupDetailsModal';
import { GroupLinkGeneratorModal } from './GroupLinkGeneratorModal';
import { GroupFilterToolbar } from './GroupFilterToolbar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Group } from '../types/groups.types';
import { STAGE_ORDER, STAGE_GRADES_MAP, getStageName } from '../utils/group-stages';

export function GroupList() {
  const { data: groups, isLoading, isError, error, refetch } = useGroups();
  const {
    selectedYears,
    setSelectedYears,
    selectedTerms,
    setSelectedTerms,
  } = useStoredAcademicPeriod(groups);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Calculate available grade options dynamically based on selected stages
  const availableGradeOptions = useMemo(() => {
    let gradesList: string[] = [];

    if (selectedStages.length > 0) {
      selectedStages.forEach((stage) => {
        if (STAGE_GRADES_MAP[stage]) {
          gradesList.push(...STAGE_GRADES_MAP[stage]);
        }
      });
    } else {
      Object.values(STAGE_GRADES_MAP).forEach((grades) => {
        gradesList.push(...grades);
      });
    }

    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.gradeLevel && !gradesList.includes(g.gradeLevel)) {
          const groupStage = getStageName(g.gradeLevel);
          if (selectedStages.length === 0 || selectedStages.includes(groupStage)) {
            gradesList.push(g.gradeLevel);
          }
        }
      });
    }

    return Array.from(new Set(gradesList)).map((grade) => ({
      label: grade,
      value: grade,
    }));
  }, [selectedStages, groups]);

  const handleStagesChange = useCallback((newStages: string[]) => {
    setSelectedStages(newStages);
    if (newStages.length > 0) {
      setSelectedGrades((prevGrades) =>
        prevGrades.filter((grade) => {
          const stage = getStageName(grade);
          return newStages.includes(stage);
        })
      );
    }
  }, []);

  const handleGradesChange = useCallback((newGrades: string[]) => {
    setSelectedGrades(newGrades);
  }, []);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2026-2027');
    yearsSet.add('2025-2026');
    yearsSet.add('2024-2025');

    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.academicYear && g.academicYear.trim()) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }

    return Array.from(yearsSet)
      .sort()
      .reverse()
      .map((year) => ({
        label: year,
        value: year,
        icon: <Calendar className="w-3.5 h-3.5 text-primary-600" />,
      }));
  }, [groups]);

  const availableTerms = useMemo(
    () => [
      {
        label: 'الفصل الدراسي الأول (ترم أول)',
        value: 'FIRST_TERM',
        icon: <BookOpen className="w-3.5 h-3.5 text-primary-600" />,
      },
      {
        label: 'الفصل الدراسي الثاني (ترم ثانٍ)',
        value: 'SECOND_TERM',
        icon: <BookOpen className="w-3.5 h-3.5 text-primary-600" />,
      },
    ],
    []
  );

  const availableLocations = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    const locSet = new Set<string>();
    groups.forEach((g) => {
      const stage = getStageName(g.gradeLevel);
      const stageMatch = selectedStages.length === 0 || selectedStages.includes(stage);
      const gradeMatch = selectedGrades.length === 0 || selectedGrades.includes(g.gradeLevel);

      if (stageMatch && gradeMatch) {
        g.schedules?.forEach((s) => {
          if (s.location && s.location.trim()) {
            locSet.add(s.location.trim());
          }
        });
      }
    });

    if (locSet.size === 0) {
      groups.forEach((g) => {
        g.schedules?.forEach((s) => {
          if (s.location && s.location.trim()) {
            locSet.add(s.location.trim());
          }
        });
      });
    }

    return Array.from(locSet);
  }, [groups, selectedStages, selectedGrades]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((group) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        group.name.toLowerCase().includes(q) ||
        (group.gradeLevel && group.gradeLevel.toLowerCase().includes(q)) ||
        (group.academicYear && group.academicYear.toLowerCase().includes(q)) ||
        (group.schedules &&
          group.schedules.some((s) => s.location && s.location.toLowerCase().includes(q)));

      const stage = getStageName(group.gradeLevel);
      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(group.gradeLevel);
      
      const matchesLocation =
        selectedLocations.length === 0 ||
        (group.schedules &&
          group.schedules.some((s) => s.location && selectedLocations.includes(s.location)));

      const matchesYear =
        selectedYears.length === 0 ||
        (group.academicYear && selectedYears.includes(group.academicYear));

      const matchesTerm =
        selectedTerms.length === 0 ||
        (group.academicTerm && selectedTerms.includes(group.academicTerm));

      return matchesSearch && matchesStage && matchesGrade && matchesLocation && matchesYear && matchesTerm;
    });
  }, [groups, searchQuery, selectedStages, selectedGrades, selectedLocations, selectedYears, selectedTerms]);

  const groupedGroups = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      const stage = getStageName(group.gradeLevel);
      if (!acc[stage]) acc[stage] = {};
      if (!acc[stage][group.gradeLevel]) acc[stage][group.gradeLevel] = [];
      acc[stage][group.gradeLevel].push(group);
      return acc;
    }, {} as Record<string, Record<string, Group[]>>);
  }, [filteredGroups]);

  const availableStages = useMemo(() => {
    return Object.keys(groupedGroups).sort(
      (a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b)
    );
  }, [groupedGroups]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedStages.length > 0 ||
    selectedGrades.length > 0 ||
    selectedLocations.length > 0 ||
    selectedYears.length > 0 ||
    selectedTerms.length > 0;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedLocations([]);
    setSelectedYears([]);
    setSelectedTerms([]);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">المجموعات الدراسية</h1>
          <p className="text-slate-500 mt-1">إدارة مجموعاتك الدراسية والطلاب المسجلين بها</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button onClick={() => setIsLinkModalOpen(true)} variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm">
            <Link2 className="w-4 h-4 ml-2" />
            إنشاء رابط تسجيل للمجموعة
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto font-semibold shadow-sm">
            <Plus className="w-4 h-4 ml-2" />
            مجموعة جديدة
          </Button>
        </div>
      </div>

      <GroupFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        availableYears={availableYears}
        selectedYears={selectedYears}
        onYearsChange={setSelectedYears}
        availableGradeOptions={availableGradeOptions}
        selectedGrades={selectedGrades}
        onGradesChange={handleGradesChange}
        availableTerms={availableTerms}
        selectedTerms={selectedTerms}
        onTermsChange={setSelectedTerms}
        selectedStages={selectedStages}
        onStagesChange={handleStagesChange}
        availableLocations={availableLocations}
        selectedLocations={selectedLocations}
        onLocationsChange={setSelectedLocations}
        filteredCount={filteredGroups.length}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

      {/* Content Section */}
      {isError ? (
        <Alert variant="error" className="border-red-100 bg-red-50 text-red-800">
          <AlertCircle className="w-5 h-5 ml-2 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">تعذر تحميل المجموعات</p>
            <p className="text-xs mt-1 opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4 bg-white border-red-200 text-red-600 hover:bg-red-50">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-48 flex flex-col shadow-sm">
              <Skeleton className="h-6 w-1/2 mb-4 rounded-md" />
              <Skeleton className="h-4 w-3/4 mb-2 rounded-md" />
              <Skeleton className="h-4 w-1/3 mb-auto rounded-md" />
              <div className="flex justify-between mt-4 pt-4 border-t border-slate-50">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-5">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد مجموعات دراسية</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm leading-relaxed">
            قم بإنشاء مجموعتك الأولى لتبدأ في إدارة الطلاب وتسجيل الحضور والغياب وتنظيم المواعيد.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="px-8 shadow-sm">
            <Plus className="w-4 h-4 ml-2" />
            إنشاء مجموعة جديدة
          </Button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500 mt-1 text-sm">لم يتم العثور على مجموعات تطابق خيارات الفلترة المحددة</p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-6 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
            <RotateCcw className="w-3.5 h-3.5 ml-2" />
            مسح الفلاتر
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {availableStages.map((stage) => {
            const stageGrades = Object.keys(groupedGroups[stage]).sort();
            if (stageGrades.length === 0) return null;
            
            return (
              <div key={stage} className="space-y-8">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{stage}</h2>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {Object.values(groupedGroups[stage]).flat().length}
                  </span>
                </div>

                <div className="space-y-8">
                  {stageGrades.map((grade) => (
                    <div key={grade} className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                        {grade || 'بدون صف'}
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupedGroups[stage][grade].map((group) => (
                          <GroupCard
                            key={group.id}
                            group={group}
                            onClick={() => setSelectedGroupId(group.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <GroupLinkGeneratorModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />

      <GroupDetailsModal
        groupId={selectedGroupId}
        isOpen={!!selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
      />
    </div>
  );
}
