'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MultiSelectDropdown } from '@/features/groups/components/MultiSelectDropdown';
import { useStudents } from '../hooks/use-students';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { AcademicStatus } from '../types/students.types';
import { Search, RotateCcw, Users, Calendar, BookOpen } from 'lucide-react';

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

const getStageName = (gradeLevel?: string, academicStage?: string) => {
  if (academicStage === 'PRIMARY' || gradeLevel?.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (academicStage === 'MIDDLE' || gradeLevel?.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (academicStage === 'SECONDARY' || gradeLevel?.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

export function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Fetch groups to populate group filter options
  const { data: groups } = useGroups();

  // Synchronized System Academic Period (Read-only from global system switcher)
  const {
    activeYear,
    activeTerm,
  } = useStoredAcademicPeriod(groups);

  // Local filter toolbar states initialized with system active period
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  // Automatically synchronize local filters when global system academic period changes from top navbar
  useEffect(() => {
    if (activeYear) {
      setSelectedYears([activeYear]);
    }
  }, [activeYear]);

  useEffect(() => {
    if (activeTerm) {
      setSelectedTerms([activeTerm]);
    }
  }, [activeTerm]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2025-2026');
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

  // Fetch students (fetch larger page for seamless client-side multi-filtering)
  const { data, isLoading, isError } = useStudents({
    cursor,
    limit: 50,
  });

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

    // Also include any custom grades present in the students data
    if (data?.data && Array.isArray(data.data)) {
      data.data.forEach((st) => {
        if (st.gradeLevel && !gradesList.includes(st.gradeLevel)) {
          const stStage = getStageName(st.gradeLevel, st.academicStage);
          if (selectedStages.length === 0 || selectedStages.includes(stStage)) {
            gradesList.push(st.gradeLevel);
          }
        }
      });
    }

    return Array.from(new Set(gradesList)).map((grade) => ({
      label: grade,
      value: grade,
    }));
  }, [selectedStages, data]);

  // Prune non-matching grades on stage change
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

  // Handle grade change
  const handleGradesChange = useCallback((newGrades: string[]) => {
    setSelectedGrades(newGrades);
  }, []);

  // Available groups for filter dropdown filtered by chosen academic year, semester, stage & grade
  const availableGroupOptions = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    return groups
      .filter((g) => {
        // 1. Stage filter
        const groupStage = getStageName(g.gradeLevel);
        const matchesStage = selectedStages.length === 0 || selectedStages.includes(groupStage);

        // 2. Grade filter
        const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(g.gradeLevel);

        // 3. Academic Year filter
        const matchesYear =
          selectedYears.length === 0 ||
          (g.academicYear && selectedYears.includes(g.academicYear));

        // 4. Academic Term filter
        const matchesTerm =
          selectedTerms.length === 0 ||
          (g.academicTerm && selectedTerms.includes(g.academicTerm));

        return matchesStage && matchesGrade && matchesYear && matchesTerm;
      })
      .map((g) => ({
        label: g.name,
        value: g.id,
        icon: <Users className="w-3.5 h-3.5 text-primary-600" />,
      }));
  }, [groups, selectedStages, selectedGrades, selectedYears, selectedTerms]);

  // Fast group lookup map
  const groupMap = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return new Map<string, any>();
    return new Map(groups.map((g) => [g.id, g]));
  }, [groups]);

  // Prune any selected groups that are no longer available in the filtered options
  React.useEffect(() => {
    if (selectedGroups.length > 0) {
      const validGroupIds = new Set(availableGroupOptions.map((g) => g.value));
      setSelectedGroups((prev) => {
        const filtered = prev.filter((id) => validGroupIds.has(id));
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [availableGroupOptions]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((student) => {
      // 1. Search filter
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        student.user.fullName.toLowerCase().includes(q) ||
        student.studentCode.toLowerCase().includes(q) ||
        (student.user.phone && student.user.phone.includes(q)) ||
        (student.gradeLevel && student.gradeLevel.toLowerCase().includes(q)) ||
        (student.groupEnrollments &&
          student.groupEnrollments.some((e) => e.group.name.toLowerCase().includes(q)));

      // 2. Stage filter
      const stage = getStageName(student.gradeLevel, student.academicStage);
      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);

      // 3. Grade filter
      const matchesGrade =
        selectedGrades.length === 0 ||
        (student.gradeLevel && selectedGrades.includes(student.gradeLevel));

      // 4. Group filter
      const matchesGroup =
        selectedGroups.length === 0 ||
        (student.groupEnrollments &&
          student.groupEnrollments.some((e) => selectedGroups.includes(e.group.id)));

      // 5. Academic Year filter
      const matchesYear =
        selectedYears.length === 0 ||
        (student.groupEnrollments &&
          student.groupEnrollments.some((e) => {
            const groupInfo = groupMap.get(e.group.id);
            return groupInfo?.academicYear && selectedYears.includes(groupInfo.academicYear);
          }));

      // 6. Academic Term filter
      const matchesTerm =
        selectedTerms.length === 0 ||
        (student.groupEnrollments &&
          student.groupEnrollments.some((e) => {
            const groupInfo = groupMap.get(e.group.id);
            return groupInfo?.academicTerm && selectedTerms.includes(groupInfo.academicTerm);
          }));

      return matchesSearch && matchesStage && matchesGrade && matchesGroup && matchesYear && matchesTerm;
    });
  }, [data, searchTerm, selectedStages, selectedGrades, selectedGroups, selectedYears, selectedTerms, groupMap]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedStages.length > 0 ||
    selectedGrades.length > 0 ||
    selectedGroups.length > 0 ||
    selectedYears.length > 0 ||
    selectedTerms.length > 0;

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedGroups([]);
    setSelectedYears([]);
    setSelectedTerms([]);
  };

  const getStatusColor = (status: AcademicStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'GRADUATED':
        return 'info';
      case 'DROPPED_OUT':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: AcademicStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'نشط';
      case 'GRADUATED':
        return 'خريج';
      case 'DROPPED_OUT':
        return 'منسحب';
      case 'SUSPENDED':
        return 'موقوف';
      default:
        return status;
    }
  };

  const handleNextPage = () => {
    if (data?.meta.hasMore && data?.meta.nextCursor) {
      setCursor(data.meta.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (data?.meta.prevCursor) {
      setCursor(data.meta.prevCursor);
    } else {
      setCursor(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        {/* Row 1: Search, Academic Year, Term */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="search"
              placeholder="ابحث بالاسم، رقم الهاتف أو الكود..."
              className="pr-10 h-10 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 focus:border-primary-500 rounded-lg transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Academic Year MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="العام الدراسي"
              allSelectedLabel="جميع الأعوام الدراسية"
              options={availableYears}
              selectedValues={selectedYears}
              onChange={setSelectedYears}
            />
          </div>

          {/* Academic Term MultiSelect Checkboxes Dropdown */}
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

        {/* Row 2: Stage, Grade, Groups */}
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

          {/* Grade Level MultiSelect Checkboxes Dropdown */}
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

          {/* Group MultiSelect Checkboxes Dropdown */}
          <div className="md:col-span-6">
            <MultiSelectDropdown
              placeholder="المجموعة الدراسية"
              allSelectedLabel="جميع المجموعات"
              withSearch={true}
              options={availableGroupOptions}
              selectedValues={selectedGroups}
              onChange={setSelectedGroups}
            />
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
            <div className="text-slate-500">
              تم العثور على <span className="font-bold text-primary-600">{filteredStudents.length}</span> طالب
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

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-5 font-bold text-slate-700 text-start whitespace-nowrap">اسم الطالب</th>
                <th className="px-6 py-5 font-bold text-slate-700 text-start whitespace-nowrap">كود الطالب</th>
                <th className="px-6 py-5 font-bold text-slate-700 text-start whitespace-nowrap">المرحلة الدراسية</th>
                <th className="px-6 py-5 font-bold text-slate-700 text-start whitespace-nowrap">المجموعة</th>
                <th className="px-6 py-5 font-bold text-slate-700 text-start whitespace-nowrap">الحالة</th>
                <th className="px-6 py-5 font-bold text-slate-700 text-end whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-medium">جاري تحميل الطلاب...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500 bg-red-50/50">
                    فشل تحميل الطلاب. يرجى المحاولة مرة أخرى.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-slate-600">
                        {hasActiveFilters ? 'لا يوجد طلاب مطابقين لخيارات الفلترة المحددة.' : 'لم يتم العثور على طلاب.'}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
                          <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                          إعادة تعيين الفلاتر
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <Link href={`/teacher/students/${student.id}`} className="flex items-center gap-3 w-fit">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm border border-primary-100/50 shadow-sm">
                          {student.user.fullName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700 hover:text-primary-600 transition-colors">
                          {student.user.fullName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200/60">
                        {student.studentCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {student.gradeLevel || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {student.groupEnrollments[0]?.group.name || <span className="text-slate-400 italic">غير معين</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(student.academicStatus)} className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm">
                        {getStatusText(student.academicStatus)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Link href={`/teacher/students/${student.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold bg-white hover:bg-primary-50 hover:text-primary-600 border-slate-200 hover:border-primary-200 transition-all shadow-sm">
                          عرض التفاصيل
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={!cursor}
              className="rounded-xl"
            >
              السابق
            </Button>
            <span className="text-sm text-slate-500">نتائج الصفحة</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data.meta.hasMore}
              className="rounded-xl"
            >
              التالي
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
