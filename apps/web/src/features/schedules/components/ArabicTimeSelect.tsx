'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { formatArabicTime12H } from '../utils/time.utils';

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MINUTES_FRACTIONS = [
  { minute: 0, label: '00: تماماً' },
  { minute: 15, label: '15: وربع' },
  { minute: 30, label: '30: ونصف' },
  { minute: 45, label: '45: إلا ربع' },
];

interface ArabicTimeSelectProps {
  value?: string | null;
  onChange: (value24h: string) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: 'right' | 'left' | 'auto';
  error?: string;
}

export function ArabicTimeSelect({
  value,
  onChange,
  label,
  disabled = false,
  placeholder = 'اختر الوقت',
  className = '',
  align = 'right',
  error,
}: ArabicTimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current 24h or Arabic value into hour12, minute, and period ('ص' | 'م')
  const parsedTime = useMemo(() => {
    let h12 = 4;
    let minute = 0;
    let period: 'ص' | 'م' = 'م';

    if (value) {
      const clean = value.trim();
      const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|ص|م)?/i);
      if (match) {
        let rawH = parseInt(match[1], 10);
        let rawM = parseInt(match[2], 10);
        const rawPeriod = match[3]?.toUpperCase();

        if (rawPeriod === 'PM' || rawPeriod === 'م') {
          period = 'م';
          h12 = rawH % 12 === 0 ? 12 : rawH % 12;
        } else if (rawPeriod === 'AM' || rawPeriod === 'ص') {
          period = 'ص';
          h12 = rawH % 12 === 0 ? 12 : rawH % 12;
        } else {
          // Standard 24h
          period = rawH >= 12 ? 'م' : 'ص';
          h12 = rawH % 12 === 0 ? 12 : rawH % 12;
        }

        // Snap minute to nearest quarter (0, 15, 30, 45)
        if (rawM < 8) minute = 0;
        else if (rawM < 23) minute = 15;
        else if (rawM < 38) minute = 30;
        else if (rawM < 53) minute = 45;
        else {
          minute = 0;
          h12 = (h12 % 12) + 1;
        }
      }
    }

    return { hour12: h12, minute, period };
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateTime = (h: number, m: number, p: 'ص' | 'م') => {
    let h24 = h;
    if (p === 'م' && h < 12) h24 = h + 12;
    if (p === 'ص' && h === 12) h24 = 0;

    const hStr = h24 < 10 ? `0${h24}` : `${h24}`;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    onChange(`${hStr}:${mStr}`);
  };

  const handleHourSelect = (h: number) => {
    updateTime(h, parsedTime.minute, parsedTime.period);
  };

  const handleMinuteSelect = (m: number) => {
    updateTime(parsedTime.hour12, m, parsedTime.period);
  };

  const handlePeriodSelect = (p: 'ص' | 'م') => {
    updateTime(parsedTime.hour12, parsedTime.minute, p);
  };

  const formattedDisplay = useMemo(() => {
    if (!value) return placeholder;
    const hStr = `${parsedTime.hour12}`;
    const mStr = parsedTime.minute < 10 ? `0${parsedTime.minute}` : `${parsedTime.minute}`;
    return `${hStr}:${mStr} ${parsedTime.period}`;
  }, [value, parsedTime, placeholder]);

  const alignmentClass = align === 'left' ? 'left-0 right-auto' : 'right-0 left-auto';

  return (
    <div className={`relative flex flex-col ${className}`} ref={containerRef}>
      {label && (
        <label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary-600 shrink-0" />
          <span>{label}</span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-3 py-2 bg-white rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400' : 'cursor-pointer text-slate-800'}`}
        dir="rtl"
      >
        <span className="flex items-center gap-2 truncate">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={value ? 'text-slate-900 font-extrabold text-sm' : 'text-slate-400 font-normal'}>
            {formattedDisplay}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-600' : ''
          }`}
        />
      </button>

      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}

      {/* Dual Column Dropdown Popup */}
      {isOpen && !disabled && (
        <div
          className={`absolute top-full ${alignmentClass} mt-1.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl z-[70] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col`}
          dir="rtl"
        >
          {/* Header Preview & AM/PM Switcher */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 space-y-2">
            {/* Top row: Preview */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">الوقت المحدد:</span>
              <span className="text-xs font-black text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/80 shadow-2xs">
                {formattedDisplay}
              </span>
            </div>

            {/* AM / PM Grid Buttons */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handlePeriodSelect('ص')}
                className={`py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                  parsedTime.period === 'ص'
                    ? 'bg-sky-500 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                صباحاً (ص)
              </button>
              <button
                type="button"
                onClick={() => handlePeriodSelect('م')}
                className={`py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                  parsedTime.period === 'م'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950/80" />
                مساءً (م)
              </button>
            </div>
          </div>

          {/* Two Lists Side-by-Side: Hours Grid & Quarters/Halfs */}
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 p-2.5 gap-2">
            {/* Column 1 (Right in RTL): Hours Grid (3 columns x 4 rows = all 12 visible!) */}
            <div className="space-y-1.5 pl-0.5">
              <div className="px-1 text-[11px] font-extrabold text-slate-400">
                الساعة (1 - 12)
              </div>
              <div className="grid grid-cols-3 gap-1">
                {HOURS_12.map((h) => {
                  const isSelected = parsedTime.hour12 === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={`h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-xs scale-[1.02]'
                          : 'hover:bg-slate-100 text-slate-700 bg-slate-50/90 border border-slate-100'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2 (Left in RTL): Minutes (Quarters / Halfs) List */}
            <div className="space-y-1.5 pr-0.5">
              <div className="px-1 text-[11px] font-extrabold text-slate-400">
                الدقائق
              </div>
              <div className="space-y-1 pt-0.5">
                {MINUTES_FRACTIONS.map((mf) => {
                  const isSelected = parsedTime.minute === mf.minute;

                  return (
                    <button
                      key={mf.minute}
                      type="button"
                      onClick={() => handleMinuteSelect(mf.minute)}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-primary-50 text-primary-800 border border-primary-300 shadow-2xs font-black'
                          : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border border-slate-100'
                      }`}
                    >
                      <span className="truncate">{mf.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Done Button */}
          <div className="p-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              تأكيد الوقت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

