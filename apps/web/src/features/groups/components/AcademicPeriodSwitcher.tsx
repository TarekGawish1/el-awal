'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  ChevronDown,
  Check,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
  Lock,
  ArrowLeftRight,
} from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'el_awal_saved_academic_years';
const DEFAULT_YEARS = ['2026-2027', '2027-2028', '2025-2026', '2028-2029', '2024-2025'];

export function AcademicPeriodSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [addYearError, setAddYearError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  // Only TEACHER and SECRETARIAT (assistant with permission) can change the academic year & semester
  const canChangePeriod = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';

  const { data: groups } = useGroups();
  const {
    setSelectedYears,
    setSelectedTerms,
    activeYear,
    activeTerm,
    isSyncingWithDb,
  } = useStoredAcademicPeriod(groups);

  // Staged / Pending selections before confirming
  const [pendingYear, setPendingYear] = useState<string>(activeYear);
  const [pendingTerm, setPendingTerm] = useState<string>(activeTerm);

  // Synchronize pending selections when modal opens or active period changes
  useEffect(() => {
    if (isOpen) {
      setPendingYear(activeYear);
      setPendingTerm(activeTerm);
      setIsAddingYear(false);
    }
  }, [isOpen, activeYear, activeTerm]);

  // Load custom saved years
  const [customYears, setCustomYears] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Extract all distinct years
  const allYears = useMemo(() => {
    const yearsSet = new Set<string>();
    DEFAULT_YEARS.forEach((y) => yearsSet.add(y));
    customYears.forEach((y) => yearsSet.add(y));
    if (activeYear) yearsSet.add(activeYear);
    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.academicYear && g.academicYear.trim()) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }
    return Array.from(yearsSet).sort().reverse();
  }, [customYears, activeYear, groups]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingYear(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectYear = (year: string) => {
    if (!canChangePeriod) {
      toast.error('عذراً، تغيير العام الدراسي متاح فقط للمعلم والمساعد المصرح له.');
      return;
    }
    setPendingYear(year);
  };

  const handleSelectTerm = (term: string) => {
    if (!canChangePeriod) {
      toast.error('عذراً، تغيير الفصل الدراسي متاح فقط للمعلم والمساعد المصرح له.');
      return;
    }
    setPendingTerm(term);
  };

  const handleAddNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangePeriod) return;

    const trimmed = newYearInput.trim();
    if (!trimmed) {
      setAddYearError('يرجى كتابة صيغة العام (مثال: 2027-2028)');
      return;
    }

    if (!customYears.includes(trimmed)) {
      const updated = [...customYears, trimmed];
      setCustomYears(updated);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
    }

    setPendingYear(trimmed);
    setNewYearInput('');
    setIsAddingYear(false);
  };

  const handleApplyChanges = () => {
    if (!canChangePeriod) {
      toast.error('ليس لديك صلاحية لتعديل العام والفصل الدراسي.');
      return;
    }

    if (pendingYear !== activeYear) {
      setSelectedYears([pendingYear]);
    }
    if (pendingTerm !== activeTerm) {
      setSelectedTerms([pendingTerm]);
    }

    toast.success('تم تحديث العام والفصل الدراسي وتطبيقه على كامل النظام بنجاح');
    setIsOpen(false);
  };

  const hasChanges = pendingYear !== activeYear || pendingTerm !== activeTerm;
  const termLabel = activeTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول';
  const pendingTermLabel = pendingTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول';

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-primary-50/80 hover:bg-primary-100/90 border border-primary-200/80 text-primary-900 transition-all shadow-2xs group cursor-pointer"
        title={canChangePeriod ? 'تغيير العام والفصل الدراسي الافتراضي للنظام' : 'العام والفصل الدراسي النشط (للعرض فقط)'}
      >
        <div className="flex items-center gap-1 text-primary-600">
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1 text-xs font-bold leading-none">
          <span className="hidden sm:inline">العام </span>
          <span>{activeYear}</span>
          <span className="text-primary-300">•</span>
          <span className="text-primary-700 font-semibold">{termLabel}</span>
        </div>
        {!canChangePeriod ? (
          <Lock className="w-3 h-3 text-slate-400 ms-0.5" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ms-0.5" />
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-primary-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Switcher Dropdown */}
      {isOpen && (
        <div className="absolute start-auto end-0 mt-2 w-[calc(100vw-2rem)] sm:w-[410px] max-w-[410px] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 text-start">
          {/* Header */}
          <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    العام والفصل الدراسي النشط
                  </h4>
                  {!canChangePeriod && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5" />
                      للعرض فقط
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  يتحكم في تصفية المجموعات، الحصص، الامتحانات، والحسابات
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent Warning Banner for Authorized Users */}
          {canChangePeriod ? (
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-amber-900 mb-3.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-snug">
                <span className="font-black text-amber-950 block mb-0.5">
                  ⚠️ تنبيه هام لكامل المنصة:
                </span>
                <span className="text-[11px] text-amber-800 font-medium">
                  تغيير العام أو الفصل الدراسي سيؤثر على كامل النظام وجميع المعلمين والطلاب في تصفية المجموعات، الحصص المجدولة، الواجبات، والتقارير المالية.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 text-slate-600 mb-3.5 text-xs">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                تعديل العام الدراسي متاح فقط للمعلم والمساعد (السكرتارية) المصرح له.
              </span>
            </div>
          )}

          {/* Academic Year Selection */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                العام الدراسي
              </span>
              {canChangePeriod && !isAddingYear && (
                <button
                  type="button"
                  onClick={() => setIsAddingYear(true)}
                  className="text-[11px] text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  إضافة عام جديد
                </button>
              )}
            </div>

            {/* Inline Add New Year Input */}
            {canChangePeriod && isAddingYear && (
              <form
                onSubmit={handleAddNewYear}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mb-2"
              >
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="مثال: 2027-2028"
                    value={newYearInput}
                    onChange={(e) => {
                      setNewYearInput(e.target.value);
                      if (addYearError) setAddYearError('');
                    }}
                    autoFocus
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs px-3 rounded-lg">
                    حفظ
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2 text-slate-400 rounded-lg"
                    onClick={() => setIsAddingYear(false)}
                  >
                    إلغاء
                  </Button>
                </div>
                {addYearError && <p className="text-[10px] text-red-500">{addYearError}</p>}
              </form>
            )}

            {/* Year Chips Grid */}
            <div className="grid grid-cols-2 gap-2">
              {allYears.map((yr) => {
                const isSelected = (canChangePeriod ? pendingYear : activeYear) === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    disabled={!canChangePeriod}
                    onClick={() => handleSelectYear(yr)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      !canChangePeriod
                        ? isSelected
                          ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                          : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
                    }`}
                  >
                    <span>{yr}</span>
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 ${!canChangePeriod ? 'text-slate-700' : 'text-white'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Academic Semester Selection */}
          <div className="space-y-2 mb-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-primary-600" />
              الفصل الدراسي (الترم)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canChangePeriod}
                onClick={() => handleSelectTerm('FIRST_TERM')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border ${
                  !canChangePeriod
                    ? activeTerm === 'FIRST_TERM'
                      ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                      : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                    : pendingTerm === 'FIRST_TERM'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
                }`}
              >
                <span>الفصل الأول</span>
                <span
                  className={`text-[10px] font-medium mt-0.5 ${
                    (canChangePeriod ? pendingTerm === 'FIRST_TERM' : activeTerm === 'FIRST_TERM')
                      ? 'text-primary-100'
                      : 'text-slate-500'
                  }`}
                >
                  ترم أول
                </span>
              </button>

              <button
                type="button"
                disabled={!canChangePeriod}
                onClick={() => handleSelectTerm('SECOND_TERM')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border ${
                  !canChangePeriod
                    ? activeTerm === 'SECOND_TERM'
                      ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                      : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                    : pendingTerm === 'SECOND_TERM'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
                }`}
              >
                <span>الفصل الثاني</span>
                <span
                  className={`text-[10px] font-medium mt-0.5 ${
                    (canChangePeriod ? pendingTerm === 'SECOND_TERM' : activeTerm === 'SECOND_TERM')
                      ? 'text-primary-100'
                      : 'text-slate-500'
                  }`}
                >
                  ترم ثانٍ
                </span>
              </button>
            </div>
          </div>

          {/* Pending Changes Confirmation Preview */}
          {canChangePeriod && hasChanges && (
            <div className="p-3 bg-amber-100/70 border border-amber-300/80 rounded-2xl mb-3 flex items-center justify-between text-xs text-amber-950 font-bold animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  تغيير إلى: <span className="underline">{pendingYear}</span> ({pendingTermLabel})
                </span>
              </div>
              <span className="text-[10px] text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md font-extrabold">
                في انتظار التأكيد
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            {canChangePeriod && hasChanges ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPendingYear(activeYear);
                    setPendingTerm(activeTerm);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                >
                  إلغاء التحديد
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-3 rounded-xl cursor-pointer"
                    onClick={() => {
                      setPendingYear(activeYear);
                      setPendingTerm(activeTerm);
                      setIsOpen(false);
                    }}
                  >
                    تراجع
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 cursor-pointer"
                    disabled={isSyncingWithDb}
                    onClick={handleApplyChanges}
                  >
                    {isSyncingWithDb ? 'جاري التطبيق...' : 'تأكيد وتطبيق على كامل النظام'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <Check className="w-3 h-3" />
                  مُفعل على كامل النظام
                </span>
                <Button
                  size="sm"
                  className="h-7 text-xs px-4 rounded-lg cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  إغلاق
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

