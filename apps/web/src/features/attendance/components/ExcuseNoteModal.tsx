'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExcuseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentCode?: string;
  initialNote?: string;
  onSave: (note: string) => void;
}

const COMMON_EXCUSES = [
  'عذر مرضي 🏥',
  'ظرف عائلي طارئ 👨‍👩‍👧',
  'إذن مسبق من ولي الأمر 📝',
  'سفر أو تنقل ✈️',
  'مواعيد امتحانات مدرسية 📚',
];

export function ExcuseNoteModal({
  isOpen,
  onClose,
  studentName,
  studentCode,
  initialNote = '',
  onSave,
}: ExcuseNoteModalProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleQuickSelect = (excuse: string) => {
    setNote(excuse);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">تسجيل عذر غياب</h3>
            <p className="text-xs text-slate-500 mt-0.5">أدخل سبب الغياب لتسجيل الطالب كـ (بعذر)</p>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
              {studentName ? studentName.charAt(0) : 'ط'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{studentName}</p>
              {studentCode && (
                <p className="text-[11px] font-mono text-slate-500">كود: {studentCode}</p>
              )}
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
            غائب بعذر
          </span>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Quick Predefined Reasons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              أسباب شائعة جاهزة (اختياري):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EXCUSES.map((excuse) => (
                <button
                  type="button"
                  key={excuse}
                  onClick={() => handleQuickSelect(excuse)}
                  className={`text-xs px-2.5 py-1 rounded-xl border transition-all ${
                    note === excuse
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                  }`}
                >
                  {excuse}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Note Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              تفاصيل أو ملاحظة العذر:
            </label>
            <textarea
              className="w-full h-24 rounded-2xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-400 resize-none"
              placeholder="اكتب سبب العذر أو ملاحظات المدرس هنا..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 ml-1.5" />
              تأكيد وحفظ العذر
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl px-5"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
