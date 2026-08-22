'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Layers, AlertCircle, BookOpen, MapPin, GraduationCap, Calendar, RotateCcw } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupDetailsModal } from './GroupDetailsModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Group } from '../types/groups.types';

const STAGE_ORDER = ['المرحلة الابتدائية', 'المرحلة الإعدادية', 'المرحلة الثانوية', 'أخرى'];

const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
};

const getStageName = (gradeLevel: string) => {
  if (!gradeLevel) return 'أخرى';
  if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

export function GroupList() {
  const { data: groups, isLoading, isError, error, refetch } = useGroups();
  const {
    selectedYears,
    setSelectedYears,
    selectedTerms,
    setSelectedTerms,
  } = useStoredAcademicPeriod(groups);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Calculate available grade options dynamically based on selected stages
  const availableGradeOptions = useMemo(() => {
    let gradesList: string[] = [];

    if (selectedStages.length > 0) {
      // If stages are selected, only show grades that belong to those stages
      selectedStages.forEach((stage) => {
        if (STAGE_GRADES_MAP[stage]) {
          gradesList.push(...STAGE_GRADES_MAP[stage]);
        }
      });
    } else {
      // If no stage selected, show all grades
      Object.values(STAGE_GRADES_MAP).forEach((grades) => {
        gradesList.push(...grades);
      });
    }

    // Also include any custom grades present in the teacher's groups
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

  // Handle stage change & automatically prune/keep valid grades
  const handleStagesChange = useCallback((newStages: string[]) => {
    setSelectedStages(newStages);

    // If newStages is not empty, filter out any selected grades that don't belong to the new stages
    if (newStages.length > 0) {
      setSelectedGrades((prevGrades) =>
        prevGrades.filter((grade) => {
          const stage = getStageName(grade);
          return newStages.includes(stage);
        })
      );
    }
  }, []);

  // Handle grade change
  const handleGradesChange = useCallback((newGrades: string[]) => {
    setSelectedGrades(newGrades);
  }, []);

  // Dynamic Academic Years from groups + standard defaults
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2026-2027');
    yearsSet.add('2026-2027');
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

  // Academic Term options (الفصل الدراسي الأول و الثاني فقط)
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

  // Extract all unique places / locations from groups
  const availableLocations = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    const locSet = new Set<string>();
    groups.forEach((g) => {
      // Only consider locations from groups matching current stage/grade filters if any
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

    // If no locations found with filters, fallback to all locations in all groups
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

  // Filter groups by search query, stages, grades, locations, academic year, and academic term
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((group) => {
      // 1. Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        group.name.toLowerCase().includes(q) ||
        (group.gradeLevel && group.gradeLevel.toLowerCase().includes(q)) ||
        (group.academicYear && group.academicYear.toLowerCase().includes(q)) ||
        (group.schedules &&
          group.schedules.some((s) => s.location && s.location.toLowerCase().includes(q)));

      // 2. Stage Filter (Multi-select)
      const stage = getStageName(group.gradeLevel);
      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);

      // 3. Grade / السنة الدراسية Filter (Multi-select)
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(group.gradeLevel);

      // 4. Location Filter (Multi-select)
      const matchesLocation =
        selectedLocations.length === 0 ||
        (group.schedules &&
          group.schedules.some((s) => s.location && selectedLocations.includes(s.location)));

      // 5. Academic Year Filter (Multi-select)
      const matchesYear =
        selectedYears.length === 0 ||
        (group.academicYear && selectedYears.includes(group.academicYear));

      // 6. Academic Term Filter (Multi-select)
      const matchesTerm =
        selectedTerms.length === 0 ||
        (group.academicTerm && selectedTerms.includes(group.academicTerm));

      return matchesSearch && matchesStage && matchesGrade && matchesLocation && matchesYear && matchesTerm;
    });
  }, [groups, searchQuery, selectedStages, selectedGrades, selectedLocations, selectedYears, selectedTerms]);

  // Group by stage and then by grade
  const groupedGroups = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      const stage = getStageName(group.gradeLevel);
      if (!acc[stage]) acc[stage] = {};
      if (!acc[stage][group.gradeLevel]) acc[stage][group.gradeLevel] = [];
      acc[stage][group.gradeLevel].push(group);
      return acc;
    }, {} as Record<string, Record<string, Group[]>>);
  }, [filteredGroups]);

  // Sort stages
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
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        {/* Row 1: Search, Academic Year, Term */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              className="pr-10 h-10 text-xs sm:text-sm"
              placeholder="بحث بالاسم أو الصف أو المكان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Academic Year / العام الدراسي MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="العام الدراسي"
              allSelectedLabel="جميع الأعوام الدراسية"
              options={availableYears}
              selectedValues={selectedYears}
              onChange={setSelectedYears}
            />
          </div>

          {/* Academic Term / الفصل الدراسي MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="الفصل الدراسي"
              allSelectedLabel="جميع الفصول الدراسية"
              options={availableTerms}
              selectedValues={selectedTerms}
              onChange={setSelectedTerms}
            />
          </div>
        </div>

        {/* Row 2: Stage, Grade, Locations/Centers */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Stage MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="المرحلة التعليمية"
              allSelectedLabel="جميع المراحل التعليمية"
              options={[
                { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
              ]}
              selectedValues={selectedStages}
              onChange={handleStagesChange}
            />
          </div>

          {/* Grade Level / السنة الدراسية MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="الصف الدراسي"
              allSelectedLabel="جميع الصفوف الدراسية"
              withSearch={availableGradeOptions.length > 5}
              options={availableGradeOptions}
              selectedValues={selectedGrades}
              onChange={handleGradesChange}
            />
          </div>

          {/* Place / Location MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-6">
            <MultiSelectDropdown
              placeholder="المكان / السنتر"
              allSelectedLabel="جميع الأماكن والسناتر"
              withSearch={true}
              options={availableLocations.map((loc) => ({
                label: loc,
                value: loc,
                icon: <MapPin className="w-3.5 h-3.5 text-primary-600" />,
              }))}
              selectedValues={selectedLocations}
              onChange={setSelectedLocations}
            />
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
            <div className="text-slate-500">
              تم العثور على <span className="font-bold text-primary-600">{filteredGroups.length}</span> مجموعة
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-primary-600 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة تعيين الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Content Section */}
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
          <p className="text-slate-500 mt-1">لم يتم العثور على مجموعات تطابق خيارات الفلترة المحددة</p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
            <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
            إعادة تعيين الفلاتر
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {availableStages.map((stage) => (
            <div key={stage} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{stage}</h2>
              </div>

              <div className="space-y-8">
                {Object.keys(groupedGroups[stage]).sort().map((grade) => (
                  <div key={grade}>
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary-500 ml-2"></div>
                      {grade || 'بدون صف'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <GroupDetailsModal
        groupId={selectedGroupId}
        isOpen={!!selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
      />
    </div>
  );
}
