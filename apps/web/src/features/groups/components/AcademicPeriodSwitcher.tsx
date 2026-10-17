'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronDown,
  X,
  Sparkles,
  Lock,
  WifiOff,
} from 'lucide-react';
import { useStoredAcademicPeriod } from '../hooks/useAcademicPeriod';
import { useAuth } from '@/features/auth';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { ApiError } from '@/lib/api/errors';
import { AcademicPeriodSelectStep } from './academic-period/AcademicPeriodSelectStep';
import { AcademicPeriodPasswordStep } from './academic-period/AcademicPeriodPasswordStep';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'el_awal_saved_academic_years';
const DEFAULT_YEARS = ['2026-2027', '2027-2028', '2025-2026', '2028-2029', '2024-2025'];

const OFFLINE_LOCK_MESSAGE =
  '🔒 تغيير العام أو الفصل الدراسي يتطلب اتصالاً نشطاً بالإنترنت لتحديث بيانات الخادم بالكامل.';

export function AcademicPeriodSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [addYearError, setAddYearError] = useState('');

  const [step, setStep] = useState<'select' | 'password'>('select');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const canChangePeriod = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';

  const {
    activeYear,
    activeTerm,
    switchPeriod,
    isSwitching,
  } = useStoredAcademicPeriod();

  const [pendingYear, setPendingYear] = useState<string>(activeYear);
  const [pendingTerm, setPendingTerm] = useState<string>(activeTerm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPendingYear(activeYear);
      setPendingTerm(activeTerm);
      setIsAddingYear(false);
      setStep('select');
      setPassword('');
      setPasswordError('');
    }
  }, [isOpen, activeYear, activeTerm]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const [customYears, setCustomYears] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allYears = useMemo(() => {
    const yearsSet = new Set<string>();
    DEFAULT_YEARS.forEach((y) => yearsSet.add(y));
    customYears.forEach((y) => yearsSet.add(y));
    if (activeYear) yearsSet.add(activeYear);
    return Array.from(yearsSet).sort().reverse();
  }, [customYears, activeYear]);

  const controlsDisabled = !canChangePeriod || !isOnline || isSwitching;

  const handleTriggerClick = () => {
    if (!isOnline) {
      toast.error(OFFLINE_LOCK_MESSAGE);
      return;
    }
    setIsOpen((v) => !v);
  };

  const handleSelectYear = (year: string) => {
    if (!canChangePeriod) {
      toast.error('عذراً، تغيير العام الدراسي متاح فقط للمعلم والمساعد المصرح له.');
      return;
    }
    if (!isOnline) {
      toast.error(OFFLINE_LOCK_MESSAGE);
      return;
    }
    setPendingYear(year);
  };

  const handleSelectTerm = (term: string) => {
    if (!canChangePeriod) {
      toast.error('عذراً، تغيير الفصل الدراسي متاح فقط للمعلم والمساعد المصرح له.');
      return;
    }
    if (!isOnline) {
      toast.error(OFFLINE_LOCK_MESSAGE);
      return;
    }
    setPendingTerm(term);
  };

  const handleAddNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangePeriod || !isOnline) return;

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

  const handleRequestConfirm = () => {
    if (!canChangePeriod) {
      toast.error('ليس لديك صلاحية لتعديل العام والفصل الدراسي.');
      return;
    }
    if (!isOnline) {
      toast.error(OFFLINE_LOCK_MESSAGE);
      return;
    }
    if (!hasChanges) return;
    setPassword('');
    setPasswordError('');
    setStep('password');
  };

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      toast.error(OFFLINE_LOCK_MESSAGE);
      return;
    }
    if (!password.trim()) {
      setPasswordError('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      await switchPeriod({
        academicYear: pendingYear,
        academicTerm: pendingTerm,
        password,
      });
      toast.success('تم تحديث العام والفصل الدراسي وتطبيقه على كامل النظام بنجاح');
      setIsOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setPasswordError('كلمة المرور غير صحيحة، يرجى إعادة المحاولة');
      } else if (err instanceof ApiError && err.statusCode === 0) {
        setPasswordError(OFFLINE_LOCK_MESSAGE);
      } else {
        setPasswordError('تعذّر تغيير الفصل الدراسي، يرجى المحاولة مرة أخرى');
      }
    }
  };

  const hasChanges = pendingYear !== activeYear || pendingTerm !== activeTerm;
  const termLabel = activeTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول';
  const pendingTermLabel = pendingTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول';

  return (
    <div className="relative shrink-0">
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-disabled={!isOnline}
        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border transition-all shadow-2xs group cursor-pointer shrink-0 ${
          !isOnline
            ? 'bg-slate-100 border-slate-200 text-slate-500'
            : 'bg-primary-50/80 hover:bg-primary-100/90 border-primary-200/80 text-primary-900'
        }`}
        title={
          !isOnline
            ? 'غير متصل — تغيير العام والفصل الدراسي يتطلب اتصالاً بالإنترنت'
            : canChangePeriod
            ? 'تغيير العام والفصل الدراسي الافتراضي للنظام'
            : 'العام والفصل الدراسي النشط (للعرض فقط)'
        }
      >
        <div className={`flex items-center gap-1 ${!isOnline ? 'text-slate-400' : 'text-primary-600'}`}>
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold leading-none">
          <span className="hidden sm:inline">العام </span>
          <span>{activeYear}</span>
          <span className={!isOnline ? 'text-slate-300' : 'text-primary-300'}>•</span>
          <span className={!isOnline ? 'text-slate-600 font-semibold' : 'text-primary-700 font-semibold'}>
            {termLabel}
          </span>
        </div>
        {!isOnline ? (
          <WifiOff className="w-3 h-3 text-slate-400 ms-0.5" />
        ) : !canChangePeriod ? (
          <Lock className="w-3 h-3 text-slate-400 ms-0.5" />
        ) : (
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse ms-0.5" />
        )}
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 ${!isOnline ? 'text-slate-400' : 'text-primary-500'} ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Centered Responsive Modal (portal) */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="العام والفصل الدراسي النشط"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 text-start animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                        العام والفصل الدراسي النشط
                      </h4>
                      {!canChangePeriod && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Lock className="w-2.5 h-2.5" />
                          للعرض فقط
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      يتحكم في تصفية المجموعات، الحصص، الامتحانات، والحسابات
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Offline notice */}
              {!isOnline && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-slate-700 mb-3.5 text-xs">
                  <WifiOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-snug">{OFFLINE_LOCK_MESSAGE}</span>
                </div>
              )}

              {step === 'select' ? (
                <AcademicPeriodSelectStep
                  canChangePeriod={canChangePeriod}
                  controlsDisabled={controlsDisabled}
                  activeYear={activeYear}
                  activeTerm={activeTerm}
                  pendingYear={pendingYear}
                  pendingTerm={pendingTerm}
                  pendingTermLabel={pendingTermLabel}
                  allYears={allYears}
                  isAddingYear={isAddingYear}
                  setIsAddingYear={setIsAddingYear}
                  newYearInput={newYearInput}
                  setNewYearInput={setNewYearInput}
                  addYearError={addYearError}
                  setAddYearError={setAddYearError}
                  hasChanges={hasChanges}
                  onSelectYear={handleSelectYear}
                  onSelectTerm={handleSelectTerm}
                  onAddNewYear={handleAddNewYear}
                  onRequestConfirm={handleRequestConfirm}
                  onResetPending={() => {
                    setPendingYear(activeYear);
                    setPendingTerm(activeTerm);
                  }}
                  onClose={() => setIsOpen(false)}
                />
              ) : (
                <AcademicPeriodPasswordStep
                  pendingYear={pendingYear}
                  pendingTermLabel={pendingTermLabel}
                  password={password}
                  setPassword={setPassword}
                  passwordError={passwordError}
                  setPasswordError={setPasswordError}
                  isSwitching={isSwitching}
                  isOnline={isOnline}
                  onCancel={() => {
                    setStep('select');
                    setPassword('');
                    setPasswordError('');
                  }}
                  onSubmit={handleConfirmSwitch}
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
