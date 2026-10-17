'use client';

import React from 'react';
import { Plus } from 'lucide-react';

export interface InlineCreateModuleFormProps {
  isCreatingModule: boolean;
  setIsCreatingModule: (val: boolean) => void;
  newModuleTitle: string;
  setNewModuleTitle: (val: string) => void;
  newModuleDescription: string;
  setNewModuleDescription: (val: string) => void;
  newModuleQuizId: string;
  setNewModuleQuizId: (val: string) => void;
  examAssessments: any[];
  handleCreateModule: (e: React.FormEvent) => Promise<void>;
  isCreatingModulePending: boolean;
}

export function InlineCreateModuleForm({
  isCreatingModule,
  setIsCreatingModule,
  newModuleTitle,
  setNewModuleTitle,
  newModuleDescription,
  setNewModuleDescription,
  newModuleQuizId,
  setNewModuleQuizId,
  examAssessments,
  handleCreateModule,
  isCreatingModulePending,
}: InlineCreateModuleFormProps) {
  if (!isCreatingModule) return null;

  return (
    <form
      onSubmit={handleCreateModule}
      className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm animate-in fade-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-600" />
          <span>إنشاء وحدة تعليمية جديدة</span>
        </h3>
        <button
          type="button"
          onClick={() => setIsCreatingModule(false)}
          className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          إلغاء
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            اسم الوحدة <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="مثال: الوحدة الأولى - النحو وقواعد الإعراب"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            ربط امتحان شامل للوحدة (اختياري)
          </label>
          <select
            value={newModuleQuizId}
            onChange={(e) => setNewModuleQuizId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="">-- بدون امتحان شامل للوحدة --</option>
            {examAssessments.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          وصف وملاحظات الوحدة (اختياري)
        </label>
        <input
          type="text"
          value={newModuleDescription}
          onChange={(e) => setNewModuleDescription(e.target.value)}
          placeholder="وصف مختصر لمحتويات الوحدة..."
          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setIsCreatingModule(false)}
          className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isCreatingModulePending}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isCreatingModulePending ? 'جاري الحفظ...' : 'حفظ الوحدة'}
        </button>
      </div>
    </form>
  );
}
