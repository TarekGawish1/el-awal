'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const generateTimeOptions = () => {
  const options = [];
  for (let i = 6; i <= 23; i++) {
    for (let j = 0; j < 60; j += 15) {
      const hour24 = i.toString().padStart(2, '0');
      const minute = j.toString().padStart(2, '0');
      const value = `${hour24}:${minute}`;
      
      const hour12 = i % 12 || 12;
      const hour12Str = hour12 < 10 ? `0${hour12}` : `${hour12}`;
      const ampm = i < 12 ? 'ص' : 'م';
      const label = `${hour12Str}:${minute} ${ampm}`;
      
      options.push({ label, value });
    }
  }
  options.push({ label: '12:00 ص', value: '00:00' });
  return options;
};

export const addOneHour = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  let newHours = hours + 1;
  if (newHours === 24) newHours = 0;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const timeOptions = generateTimeOptions();

// خريطة اليوم الأول -> اليوم التاني المقترح (الثنائيات الشائعة)
export const DAY_PAIRS: Record<number, number> = {
  0: 3, // الأحد  -> الأربعاء
  1: 4, // الإثنين -> الخميس
  2: 5, // الثلاثاء -> الجمعة
  3: 0, // الأربعاء -> الأحد
  4: 1, // الخميس  -> الإثنين
  5: 2, // الجمعة  -> الثلاثاء
  6: 2, // السبت   -> الثلاثاء
};

interface TimeSelectProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  disabled?: boolean;
}

export function TimeSelect({ value, onChange, label, disabled }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current && selectedRef.current) {
      const list = listRef.current;
      const selected = selectedRef.current;
      list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
    }
  }, [isOpen]);

  const selectedOption = timeOptions.find((t) => t.value === value);

  return (
    <div className="flex-1 relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between appearance-none rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 transition-colors"
      >
        <span dir="ltr">{selectedOption ? selectedOption.label : 'اختر الوقت'}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-[100] mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-xl py-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              ref={value === opt.value ? selectedRef : null}
              type="button"
              dir="ltr"
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-primary-50 transition-colors ${
                value === opt.value ? 'bg-primary-50 text-primary-700 font-bold' : 'text-neutral-700'
              }`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
