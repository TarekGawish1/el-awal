'use client';

import React from 'react';
import { Loader2, Search, ArrowLeftRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Student } from '../../types/groups.types';

export interface AddStudentSearchResultsListProps {
  searchResults?: { data?: Student[] };
  isSearching: boolean;
  searchQuery: string;
  debouncedQuery: string;
  existingIds: Set<string>;
  selectedStudents: Student[];
  transferConfirmId: string | null;
  transferringId: string | null;
  onToggleStudent: (student: Student) => void;
  onTransfer: (student: Student) => void;
  onSetTransferConfirmId: (id: string | null) => void;
  getStudentName: (student: any) => string;
  getStudentCode: (student: any) => string;
  getOtherGroup: (student: any) => { id: string; name: string } | null;
}

export function AddStudentSearchResultsList({
  searchResults,
  isSearching,
  searchQuery,
  debouncedQuery,
  existingIds,
  selectedStudents,
  transferConfirmId,
  transferringId,
  onToggleStudent,
  onTransfer,
  onSetTransferConfirmId,
  getStudentName,
  getStudentCode,
  getOtherGroup,
}: AddStudentSearchResultsListProps) {
  return (
    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 min-h-[180px]">
      {isSearching ? (
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
        <div className="p-8 text-center text-slate-500">يرجى إدخال حرفين على الأقل للبحث</div>
      ) : searchResults?.data && searchResults.data.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {searchResults.data.map((student) => {
            const inCurrentGroup = existingIds.has(student.id);
            const otherGroup = !inCurrentGroup ? getOtherGroup(student) : null;
            const inOtherGroup = !!otherGroup;
            const isSelected = selectedStudents.some((s) => s.id === student.id);
            const selectable = !inCurrentGroup && !inOtherGroup;
            const isConfirming = transferConfirmId === student.id;
            const isTransferring = transferringId === student.id;
            return (
              <li
                key={student.id}
                className={`p-3 flex items-center justify-between gap-2 transition-all select-none ${
                  inCurrentGroup
                    ? 'bg-slate-50 cursor-not-allowed opacity-70'
                    : inOtherGroup
                      ? 'bg-orange-50/40'
                      : isSelected
                        ? 'bg-primary-50 border-r-4 border-r-primary-500 cursor-pointer'
                        : 'hover:bg-slate-100 bg-white cursor-pointer'
                }`}
                onClick={() => {
                  if (selectable) onToggleStudent(student);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold text-sm truncate max-w-full ${
                        isSelected ? 'text-primary-800' : 'text-slate-800'
                      }`}
                    >
                      {getStudentName(student)}
                    </span>
                    {inCurrentGroup && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold truncate max-w-full">
                        موجود بالفعل في المجموعة
                      </span>
                    )}
                    {inOtherGroup && (
                      <span
                        className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold truncate max-w-full"
                        title={`في مجموعة: ${otherGroup!.name}`}
                      >
                        في مجموعة: {otherGroup!.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex gap-3 mt-1">
                    <span>{getStudentCode(student)}</span>
                    <span dir="ltr">{(student as any).user?.phone || (student as any).phone || ''}</span>
                  </div>
                </div>

                {inOtherGroup ? (
                  <div className="shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[11px] text-slate-600 font-medium hidden sm:inline-block truncate max-w-[120px]"
                          title={`نقل من ${otherGroup!.name}؟`}
                        >
                          نقل من {otherGroup!.name}؟
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={isTransferring}
                          onClick={() => onTransfer(student)}
                        >
                          {isTransferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'تأكيد'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={isTransferring}
                          onClick={() => onSetTransferConfirmId(null)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs border-primary-300 text-primary-700 hover:bg-primary-50"
                        onClick={() => onSetTransferConfirmId(student.id)}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 ml-1" />
                        نقل لهذه المجموعة
                      </Button>
                    )}
                  </div>
                ) : selectable ? (
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2 ${
                      isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : debouncedQuery ? (
        <div className="p-8 text-center text-slate-500">لا توجد نتائج مطابقة لبحثك</div>
      ) : (
        <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 h-full">
          <Search className="w-10 h-10 mb-2 opacity-50" />
          <p>ابدأ البحث لاختيار طالب أو أكثر</p>
        </div>
      )}
    </div>
  );
}
