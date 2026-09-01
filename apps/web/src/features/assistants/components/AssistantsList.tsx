import React, { useState } from 'react';
import { useAssistants, Assistant } from '../hooks/useAssistants';
import { Shield, Check, X, ShieldAlert, Users, Calendar, Banknote, AlertTriangle, Loader2 } from 'lucide-react';

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
  
  // Editing state
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Deleting state
  const [deletingAssistantId, setDeletingAssistantId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setEditFullName(assistant.assistant.fullName || '');
    setEditPhone(assistant.assistant.phone || '');
    setEditEmail(assistant.assistant.email || '');
    setEditPassword('');
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveDetails = async () => {
    if (!editingAssistant) return;
    setIsSavingDetails(true);
    setEditError('');
    setEditSuccess('');
    try {
      const payload: any = {};
      if (editFullName.trim()) payload.fullName = editFullName.trim();
      if (editPhone.trim()) payload.phone = editPhone.trim();
      if (editEmail.trim()) payload.email = editEmail.trim();
      if (editPassword.trim()) payload.password = editPassword.trim();

      await updateAssistant({
        id: editingAssistant.id,
        payload
      });
      
      setEditSuccess('تم تحديث البيانات بنجاح.');
      setEditPassword('');
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'حدث خطأ أثناء التحديث.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAssistantId) return;
    setIsDeleting(true);
    try {
      await deleteAssistant(deletingAssistantId);
      setDeletingAssistantId(null);
    } catch (err) {
      // Handle error
    } finally {
      setIsDeleting(false);
    }
  };

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
                      onClick={() => handleEdit(assistant)}
                      className="text-primary-600 hover:text-primary-700 text-xs font-bold px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      إدارة
                    </button>
                    <button
                      onClick={() => setDeletingAssistantId(assistant.id)}
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

      {/* Permissions & Details Edit Modal */}
      {editingAssistant && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-lg font-bold text-neutral-800">إدارة بيانات وصلاحيات المساعد</h2>
              <button onClick={() => setEditingAssistant(null)} className="p-2 hover:bg-neutral-100 rounded-full">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Credentials Section */}
              <section>
                <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  بيانات الحساب
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      dir="ltr"
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      dir="ltr"
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">كلمة المرور الجديدة (اختياري)</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="اتركه فارغاً لعدم التغيير"
                      dir="ltr"
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex-1">
                    {editError && <p className="text-xs text-red-600 font-medium">{editError}</p>}
                    {editSuccess && <p className="text-xs text-green-600 font-medium">{editSuccess}</p>}
                  </div>
                  <button
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="shrink-0 bg-primary-100 text-primary-700 hover:bg-primary-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                  >
                    {isSavingDetails && <Loader2 className="w-4 h-4 animate-spin" />}
                    حفظ البيانات
                  </button>
                </div>
              </section>

              <hr className="border-neutral-100" />

              {/* Status Section */}
              <section>
                <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  حالة الحساب
                </h3>
                <select 
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                  value={editingAssistant.status}
                  onChange={(e) => updateAssistant({ 
                    id: editingAssistant.id, 
                    payload: { status: e.target.value as any } 
                  })}
                >
                  <option value="ACTIVE">نشط (يمكنه الدخول وممارسة مهامه)</option>
                  <option value="SUSPENDED">موقوف (لا يمكنه تسجيل الدخول للمنصة)</option>
                </select>
              </section>

              {/* Permissions Section */}
              <section>
                <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  صلاحيات الوصول
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(PERMISSION_LABELS).map(([key, config]) => {
                    const hasPerm = editingAssistant.permissions.includes(key);
                    return (
                      <label key={key} className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:border-primary-300"
                        style={{ borderColor: hasPerm ? 'var(--color-primary-500)' : '#e5e7eb', backgroundColor: hasPerm ? 'var(--color-primary-50)' : 'transparent' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${hasPerm ? 'bg-primary-500 text-white shadow-sm' : 'bg-neutral-100 text-neutral-500'}`}>
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
              </section>
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

      {/* Delete Confirmation Modal */}
      {deletingAssistantId && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-6 scale-in-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">إزالة المساعد</h3>
            <p className="text-neutral-500 text-sm mb-8">
              هل أنت متأكد من رغبتك في إزالة هذا المساعد نهائياً؟ سيفقد المساعد إمكانية الوصول لحسابك.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingAssistantId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 font-bold rounded-xl hover:bg-neutral-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الإزالة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
