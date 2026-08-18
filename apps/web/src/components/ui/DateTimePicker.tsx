import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface DateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

// Generate time options (every 30 mins)
const generateTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      const h24 = i.toString().padStart(2, '0');
      const min = j.toString().padStart(2, '0');
      const h12 = i % 12 || 12;
      const ampm = i < 12 ? 'ص' : 'م';
      options.push({
        value: `${h24}:${min}`,
        label: `${h12}:${min} ${ampm}`
      });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export function DateTimePicker({ value, onChange, placeholder = 'اختر التاريخ والوقت', className }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Default to today
  const initDate = value ? new Date(value) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(initDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initDate.getFullYear());
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Keep existing time if any
    let timeStr = '12:00';
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
    }
    
    // Format to YYYY-MM-DDTHH:mm
    const dateStr = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}T${timeStr}`;
    onChange(dateStr);
  };

  const handleTimeSelect = (timeStr: string) => {
    let dateToUse = new Date();
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) dateToUse = d;
    }
    const [h, m] = timeStr.split(':');
    dateToUse.setHours(parseInt(h, 10));
    dateToUse.setMinutes(parseInt(m, 10));
    
    const outStr = `${dateToUse.getFullYear()}-${(dateToUse.getMonth() + 1).toString().padStart(2, '0')}-${dateToUse.getDate().toString().padStart(2, '0')}T${timeStr}`;
    onChange(outStr);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Display value
  let displayValue = '';
  let selectedDay = -1;
  let selectedMonth = -1;
  let selectedYear = -1;
  let selectedTime = '';

  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      selectedDay = d.getDate();
      selectedMonth = d.getMonth();
      selectedYear = d.getFullYear();
      selectedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      
      const ampm = d.getHours() < 12 ? 'ص' : 'م';
      const h12 = d.getHours() % 12 || 12;
      displayValue = `${selectedDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear} - ${h12}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
    }
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 appearance-none rounded-xl border bg-white px-4 py-2.5 text-sm transition-colors",
          isOpen ? "border-primary-500 ring-4 ring-primary-500/10" : "border-slate-200 hover:border-slate-300",
          !value ? "text-slate-400" : "text-slate-800 font-medium"
        )}
      >
        <CalendarIcon className="w-5 h-5 text-slate-400" />
        <span className="flex-1 text-right">{displayValue || placeholder}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-6">
          {/* Calendar Section */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="font-bold text-slate-800">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </div>
              <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const isSelected = day === selectedDay && currentMonth === selectedMonth && currentYear === selectedYear;
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                      isSelected 
                        ? "bg-primary-500 text-white font-bold shadow-md shadow-primary-500/30" 
                        : isToday 
                          ? "bg-primary-50 text-primary-700 font-bold" 
                          : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-slate-100" />

          {/* Time Section */}
          <div className="w-full md:w-40 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>الوقت</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[220px] pr-2 space-y-1 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
              {TIME_OPTIONS.map(time => {
                const isSelected = selectedTime === time.value;
                return (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => handleTimeSelect(time.value)}
                    className={cn(
                      "w-full text-right px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected 
                        ? "bg-primary-50 text-primary-700 font-bold" 
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    {time.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
