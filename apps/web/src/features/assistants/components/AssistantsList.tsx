import React, { useState } from 'react';
import { useAssistants, Assistant } from '../hooks/useAssistants';
import { Shield, MoreVertical, Check, X, ShieldAlert, Users, Calendar, Banknote } from 'lucide-react';

const PERMISSION_LABELS: Record<string, { label: string, icon: any }> = {
  MANAGE_STUDENTS: { label: 'شؤون الطلاب', icon: Users },
  VIEW_FINANCE: { label: 'الاطلاع على الماليات', icon: Banknote },
  MANAGE_FINANCE: { label: 'إدارة الماليات', icon: Banknote },
  MANAGE_ATTENDANCE: { label: 'رصد الحضور', icon: Check },
  MANAGE_GROUPS: { label: 'إدارة المجموعات', icon: Calendar },
  MANAGE_ASSESSMENTS: { label: 'الواجبات والاختبارات', icon: ShieldAlert },
};

export function AssistantsList() {
  const { assistants, isLoading, updateAssistant, deleteAssistant } = useAssistants();
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);

  if (isLoading) {
    return <div className="text-center py-10 text-neutral-500">جاري التحميل...</div>;
  }

  if (assistants.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-neutral-100">
        <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-800 mb-1">لا يوجد مساعدين</h3>
        <p className="text-neutral-500 text-sm">لم تقم بإضافة أي مساعدين بعد.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4 font-semibold">المساعد</th>
              <th className="px-6 py-4 font-semibold">الحالة</th>
              <th className="px-6 py-4 font-semibold">الصلاحيات</th>
              <th className="px-6 py-4 font-semibold w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {assistants.map((assistant: Assistant) => (
              <tr key={assistant.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-neutral-800">{assistant.assistant.fullName}</div>
                  <div className="text-xs text-neutral-500 mt-0.5" dir="ltr">
                    {assistant.assistant.phone || assistant.assistant.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                    assistant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    assistant.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {assistant.status === 'ACTIVE' ? 'نشط' :
                     assistant.status === 'SUSPENDED' ? 'موقوف' : 'دعوة معلقة'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {assistant.permissions.length === 0 ? (
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded">بدون صلاحيات</span>
                    ) : (
                      assistant.permissions.map((p) => {
                        const config = PERMISSION_LABELS[p];
                        if (!config) return null;
                        const Icon = config.icon;
                        return (
                          <span key={p} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-1 rounded text-xs font-medium border border-primary-100">
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingAssistant(assistant)}
                      className="text-primary-600 hover:text-primary-700 text-xs font-bold px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      إدارة
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من إزالة هذا المساعد نهائياً؟')) {
                          deleteAssistant(assistant.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions Modal (To be implemented or expanded) */}
      {editingAssistant && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800">إدارة صلاحيات المساعد</h2>
              <button onClick={() => setEditingAssistant(null)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-neutral-700 mb-3">حالة الحساب</h3>
                <select 
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  value={editingAssistant.status}
                  onChange={(e) => updateAssistant({ 
                    id: editingAssistant.id, 
                    payload: { status: e.target.value as any } 
                  })}
                >
                  <option value="ACTIVE">نشط (يمكنه تسجيل الدخول)</option>
                  <option value="SUSPENDED">موقوف (لا يمكنه تسجيل الدخول)</option>
                </select>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-700 mb-3">الصلاحيات</h3>
                <div className="space-y-2">
                  {Object.entries(PERMISSION_LABELS).map(([key, config]) => {
                    const hasPerm = editingAssistant.permissions.includes(key);
                    return (
                      <label key={key} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:border-primary-300"
                        style={{ borderColor: hasPerm ? 'var(--color-primary-500)' : '#e5e7eb', backgroundColor: hasPerm ? 'var(--color-primary-50)' : 'transparent' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${hasPerm ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            <config.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-sm font-medium ${hasPerm ? 'text-primary-900' : 'text-neutral-700'}`}>{config.label}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          checked={hasPerm}
                          onChange={(e) => {
                            const newPerms = e.target.checked 
                              ? [...editingAssistant.permissions, key]
                              : editingAssistant.permissions.filter(p => p !== key);
                            updateAssistant({
                              id: editingAssistant.id,
                              payload: { permissions: newPerms }
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-neutral-100 bg-neutral-50 flex justify-end">
              <button 
                onClick={() => setEditingAssistant(null)}
                className="px-6 py-2.5 bg-neutral-800 text-white text-sm font-bold rounded-xl hover:bg-neutral-900 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
