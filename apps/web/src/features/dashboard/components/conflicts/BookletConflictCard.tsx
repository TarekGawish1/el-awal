'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { syncEngine } from '@/lib/offline/sync-engine';
import { SyncConflictRecord, BookletEntity, offlineDb } from '@/lib/offline/db';

export interface BookletConflictCardProps {
  conflict: SyncConflictRecord;
  onDiscard: () => void;
}

export function BookletConflictCard({ conflict, onDiscard }: BookletConflictCardProps) {
  const [booklets, setBooklets] = useState<BookletEntity[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  const studentGrade: string =
    conflict.payload?.studentGrade ?? conflict.payload?.gradeLevel ?? '';

  useEffect(() => {
    offlineDb
      .getBookletsOffline({ gradeLevel: studentGrade || undefined, isActive: true })
      .then((list) => {
        const eligible = list.filter((b) => b.isActive);
        setBooklets(eligible);
        if (eligible.length > 0) setSelectedId(eligible[0].id);
      })
      .catch(() => setBooklets([]));
  }, [studentGrade]);

  const handleReplace = async () => {
    if (!selectedId) return;
    setIsReplacing(true);
    try {
      await syncEngine.retryConflicts([conflict.id]);
      toast.success('تم تجاهل العملية القديمة. يرجى إعادة السداد باختيار المذكرة المناسبة.');
    } catch {
      toast.error('تعذرت المعالجة، يرجى المحاولة لاحقاً');
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-white border border-amber-100 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>خيارات الحل</span>
      </div>

      {booklets.length > 0 ? (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">
            اختر مذكرة مناسبة لصف الطالب:
          </label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {booklets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} — {b.gradeLevel} ({b.price} ج.م)
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="primary"
            onClick={handleReplace}
            disabled={isReplacing}
            className="text-xs rounded-lg gap-1.5"
          >
            {isReplacing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            تعديل المذكرة وإعادة المحاولة
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {studentGrade
            ? `لا توجد مذكرات نشطة لصف "${studentGrade}". قم بإضافة مذكرة مناسبة أولاً.`
            : 'لا توجد مذكرات نشطة متاحة.'}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={onDiscard}
        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg gap-1.5 w-full"
      >
        <Trash2 className="w-3.5 h-3.5" />
        إلغاء العملية وحذفها
      </Button>
    </div>
  );
}
