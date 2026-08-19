'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, BookOpen, ChevronDown, Check, Plus, X, Sparkles } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const STORAGE_KEY = 'el_awal_saved_academic_years';
const DEFAULT_YEARS = ['2026-2027', '2027-2028', '2025-2026', '2028-2029', '2024-2025'];

export function AcademicPeriodSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [addYearError, setAddYearError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: groups } = useGroups();
  const {
    selectedYears,
    setSelectedYears,
    selectedTerms,
    setSelectedTerms,
    activeYear,
    activeTerm,
  } = useStoredAcademicPeriod(groups);

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
    setSelectedYears([year]);
  };

  const handleSelectTerm = (term: string) => {
    setSelectedTerms([term]);
  };

  const handleAddNewYear = (e: React.FormEvent) => {
    e.preventDefault();
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

    setSelectedYears([trimmed]);
    setNewYearInput('');
    setIsAddingYear(false);
  };

  const termLabel = activeTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول';

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-50/80 hover:bg-primary-100/90 border border-primary-200/80 text-primary-900 transition-all shadow-2xs group cursor-pointer"
        title="تغيير العام والفصل الدراسي الافتراضي للنظام"
      >
        <div className="flex items-center gap-1 text-primary-600">
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
          <span>العام {activeYear}</span>
          <span className="text-primary-300">•</span>
          <span className="text-primary-700 font-semibold">{termLabel}</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ms-0.5" />
        <ChevronDown className={`w-3.5 h-3.5 text-primary-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Switcher Dropdown */}
      {isOpen && (
        <div className="absolute start-0 sm:start-auto end-0 sm:end-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 text-start">
          {/* Header */}
          <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                  العام والفصل الدراسي النشط
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  يتم تحديث جميع الفلاتر والمجموعات تلقائياً
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Academic Year Selection */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                العام الدراسي
              </span>
              {!isAddingYear && (
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
            {isAddingYear && (
              <form onSubmit={handleAddNewYear} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mb-2">
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
                const isSelected = activeYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleSelectYear(yr)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                    }`}
                  >
                    <span>{yr}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
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
                onClick={() => handleSelectTerm('FIRST_TERM')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTerm === 'FIRST_TERM'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                }`}
              >
                <span>الفصل الأول</span>
                <span className={`text-[10px] font-medium mt-0.5 ${activeTerm === 'FIRST_TERM' ? 'text-primary-100' : 'text-slate-500'}`}>
                  ترم أول
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTerm('SECOND_TERM')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTerm === 'SECOND_TERM'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                }`}
              >
                <span>الفصل الثاني</span>
                <span className={`text-[10px] font-medium mt-0.5 ${activeTerm === 'SECOND_TERM' ? 'text-primary-100' : 'text-slate-500'}`}>
                  ترم ثانٍ
                </span>
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <Check className="w-3 h-3" />
              مُفعل على كامل حسابك
            </span>
            <Button
              size="sm"
              className="h-7 text-xs px-4 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              تم
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
