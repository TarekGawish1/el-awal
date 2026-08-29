'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Search, RotateCcw, Users, Calendar, BookOpen, ChevronRight, ChevronLeft, Eye, KeyRound, Filter, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { StudentDetailsModal } from './StudentDetailsModal';
import { StudentPasswordModal } from './StudentPasswordModal';

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
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);
  const [selectedStudentForPassword, setSelectedStudentForPassword] = useState<{ id: string; name: string } | null>(null);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersOpen(false);
      }
    };
    if (isFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFiltersOpen]);

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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

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
    setCurrentPage(1);
  };

  const getStatusColor = (status: AcademicStatus | string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'LEFT':
        return 'warning';
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

  const getStatusText = (status: AcademicStatus | string) => {
    switch (status) {
      case 'ACTIVE':
        return 'نشط';
      case 'LEFT':
        return 'غادر السنتر';
      case 'GRADUATED':
        return 'خريج';
      case 'DROPPED_OUT':
        return 'منسحب';
      case 'SUSPENDED':
        return 'موقوف';
      case 'ARCHIVED':
        return 'مؤرشف';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="search"
              className="pr-10 h-10 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 focus:border-primary-500 rounded-lg transition-all"
              placeholder="ابحث بالاسم، رقم الهاتف أو الكود..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Academic Year */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="العام الدراسي"
              allSelectedLabel="جميع الأعوام الدراسية"
              options={availableYears}
              selectedValues={selectedYears}
              onChange={(vals) => {
                setSelectedYears(vals);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Academic Term */}
          <div className="md:col-span-3">
            <MultiSelectDropdown
              placeholder="الفصل الدراسي"
              allSelectedLabel="جميع الفصول الدراسية"
              options={availableTerms}
              selectedValues={selectedTerms}
              onChange={(vals) => {
                setSelectedTerms(vals);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Advanced Filters Button */}
          <div className="md:col-span-1 relative" ref={filtersRef}>
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`w-full h-10 flex items-center justify-center gap-2 rounded-lg border transition-all ${
                isFiltersOpen 
                ? 'bg-primary-50 text-primary-600 border-primary-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="فلاتر متقدمة"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Advanced Filters Popover */}
            {isFiltersOpen && (
              <div className="absolute top-full left-0 mt-2 w-[calc(100vw-32px)] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-[100] space-y-4 origin-top-left rtl:origin-top-right">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">فلاتر متقدمة</h3>
                  <button onClick={() => setIsFiltersOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-1.5 rounded-md">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <MultiSelectDropdown
                    placeholder="المرحلة التعليمية"
                    allSelectedLabel="جميع المراحل التعليمية"
                    options={[
                      { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                      { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                      { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
                    ]}
                    selectedValues={selectedStages}
                    onChange={(vals) => {
                      handleStagesChange(vals);
                      setCurrentPage(1);
                    }}
                  />

                  <MultiSelectDropdown
                    placeholder="الصف الدراسي"
                    allSelectedLabel="جميع الصفوف الدراسية"
                    withSearch={availableGradeOptions.length > 5}
                    options={availableGradeOptions}
                    selectedValues={selectedGrades}
                    onChange={(vals) => {
                      handleGradesChange(vals);
                      setCurrentPage(1);
                    }}
                  />

                  <MultiSelectDropdown
                    placeholder="المجموعة الدراسية"
                    allSelectedLabel="جميع المجموعات"
                    withSearch={true}
                    options={availableGroupOptions}
                    selectedValues={selectedGroups}
                    onChange={(vals) => {
                      setSelectedGroups(vals);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            )}
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

      {/* Table & Mobile Cards Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm text-xs">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">اسم الطالب</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">كود الطالب</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">المرحلة الدراسية</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">المجموعة</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">ولي الأمر</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-start whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-end whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-medium">جاري تحميل الطلاب...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-red-500 bg-red-50/50">
                    فشل تحميل الطلاب. يرجى المحاولة مرة أخرى.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-500">
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
                paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudentForModal(student.id)}
                    className="hover:bg-slate-50/80 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 w-fit">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs border border-primary-100/50 shadow-sm">
                          {student.user.fullName.charAt(0)}
                        </div>
                        <span className="flex flex-col">
                          <span className="font-bold text-slate-700 text-xs hover:text-primary-600 transition-colors">
                            {student.user.fullName}
                          </span>
                          {student.user.phone && (
                            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                              {student.user.phone}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200/60">
                        {student.studentCode}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">
                      {student.gradeLevel || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-600 text-xs">
                      {student.groupEnrollments[0]?.group.name ? (
                        <span title={student.groupEnrollments[0].group.name}>
                          {student.groupEnrollments[0].group.name.split('(')[0].trim()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">غير معين</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {student.parentLinks?.[0]?.parent.user ? (
                        <span className="text-xs font-mono text-slate-600" dir="ltr">
                          {student.parentLinks[0].parent.user.phone || '—'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={getStatusColor(student.academicStatus)} className="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm">
                        {getStatusText(student.academicStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-end">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudentForPassword({ id: student.id, name: student.user.fullName })}
                          className="h-7 px-2 rounded-lg font-bold bg-white hover:bg-amber-50 hover:text-amber-700 border-slate-200 hover:border-amber-200 transition-all shadow-sm text-[10px]"
                          title="كلمة المرور وبيانات الدخول"
                        >
                          <KeyRound className="w-3 h-3 ml-1 text-amber-600" />
                          كلمة المرور
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudentForModal(student.id)}
                          className="h-7 px-2 rounded-lg font-bold bg-white hover:bg-primary-50 hover:text-primary-600 border-slate-200 hover:border-primary-200 transition-all shadow-sm text-[10px]"
                        >
                          <Eye className="w-3 h-3 ml-1" />
                          عرض التفاصيل
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (Optimized for Phone Screens) */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-medium text-sm">جاري تحميل الطلاب...</p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-red-500 bg-red-50/50 text-sm">
              فشل تحميل الطلاب. يرجى المحاولة مرة أخرى.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm font-medium text-slate-600">
                {hasActiveFilters ? 'لا يوجد طلاب مطابقين لخيارات الفلترة.' : 'لم يتم العثور على طلاب.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                  إعادة تعيين الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentForModal(student.id)}
                  className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-extrabold text-base border border-primary-100 shrink-0 shadow-2xs">
                        {student.user.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {student.user.fullName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                            {student.studentCode}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {student.gradeLevel || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge variant={getStatusColor(student.academicStatus)} className="text-[10px] font-bold shrink-0">
                      {getStatusText(student.academicStatus)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">المجموعة:</span>
                      <span className="font-bold text-slate-700 truncate block">
                        {student.groupEnrollments[0]?.group.name ? student.groupEnrollments[0].group.name.split('(')[0].trim() : 'غير معين'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ولي الأمر:</span>
                      <span className="font-mono text-slate-700 block text-[11px]" dir="ltr">
                        {student.parentLinks?.[0]?.parent.user?.phone || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForPassword({ id: student.id, name: student.user.fullName });
                      }}
                      className="w-full text-xs font-bold rounded-xl py-2 bg-white hover:bg-amber-50 hover:text-amber-700 border-amber-200 text-amber-800"
                    >
                      <KeyRound className="w-3.5 h-3.5 ml-1 text-amber-600" />
                      كلمة المرور
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForModal(student.id);
                      }}
                      className="w-full text-xs font-bold rounded-xl py-2 bg-white hover:bg-primary-50 hover:text-primary-600 border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5 ml-1.5" />
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredStudents.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="طالب"
            />
          </div>
        )}
      </div>

      {/* Quick View Student Modal */}
      <StudentDetailsModal
        studentId={selectedStudentForModal}
        isOpen={!!selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
      />

      {/* Quick Student Password & Credentials Modal */}
      <StudentPasswordModal
        studentId={selectedStudentForPassword?.id || null}
        studentName={selectedStudentForPassword?.name || 'الطالب'}
        isOpen={!!selectedStudentForPassword}
        onClose={() => setSelectedStudentForPassword(null)}
      />
    </div>
  );
}
