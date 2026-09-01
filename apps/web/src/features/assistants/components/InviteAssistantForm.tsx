import React, { useState } from 'react';
import { useAssistants } from '../hooks/useAssistants';
import { UserPlus, Mail, Phone, Loader2, Info, Check, ShieldAlert, Users, Calendar, Banknote } from 'lucide-react';

const PERMISSION_LABELS: Record<string, { label: string, icon: any }> = {
  MANAGE_STUDENTS: { label: 'شؤون الطلاب', icon: Users },
  VIEW_FINANCE: { label: 'الاطلاع على الماليات', icon: Banknote },
  MANAGE_FINANCE: { label: 'إدارة الماليات', icon: Banknote },
  MANAGE_ATTENDANCE: { label: 'رصد الحضور', icon: Check },
  MANAGE_GROUPS: { label: 'إدارة المجموعات', icon: Calendar },
  MANAGE_ASSESSMENTS: { label: 'الواجبات والاختبارات', icon: ShieldAlert },
};

export function InviteAssistantForm() {
  const { inviteAssistant, isInviting } = useAssistants();
  
  const [formMode, setFormMode] = useState<'invite' | 'create'>('create');
  
  // Shared state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Creation state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setError('يرجى إدخال رقم الهاتف أو البريد الإلكتروني.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const payload: any = {};
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      
      if (formMode === 'create') {
        if (!fullName.trim() || !password) {
          setError('يرجى إدخال اسم المساعد وكلمة المرور لإنشاء الحساب.');
          return;
        }
        if (!phone.trim()) {
          setError('يرجى إدخال رقم الهاتف لإنشاء الحساب.');
          return;
        }
        payload.fullName = fullName.trim();
        payload.password = password;
        payload.permissions = permissions;
      }

      await inviteAssistant(payload);
      
      setSuccess(formMode === 'create' ? 'تم إنشاء الحساب وإضافة المساعد بنجاح!' : 'تم إضافة المساعد بنجاح!');
      setPhone('');
      setEmail('');
      setFullName('');
      setPassword('');
      setPermissions([]);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
      <div className="flex border-b border-neutral-100">
        <button
          onClick={() => setFormMode('create')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${formMode === 'create' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          إنشاء مساعد جديد
        </button>
        <button
          onClick={() => setFormMode('invite')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${formMode === 'invite' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          دعوة مساعد حالي
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-800">
              {formMode === 'create' ? 'إنشاء حساب وإضافة مساعد' : 'إضافة مساعد حالي'}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {formMode === 'create' 
                ? 'أدخل بيانات المساعد لإنشاء حساب جديد له وإرسال بيانات الدخول عبر واتساب.'
                : 'قم بدعوة مساعد لديه حساب سكرتارية مسجل مسبقاً.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                رقم الهاتف {formMode === 'create' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف..."
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">البريد الإلكتروني (اختياري)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني..."
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  dir="ltr"
                />
              </div>
            </div>

            {formMode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">الاسم الكامل للمساعد <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">كلمة المرور <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور قوية"
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                    dir="ltr"
                  />
                </div>
              </>
            )}
          </div>

          {formMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">صلاحيات المساعد</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(PERMISSION_LABELS).map(([key, config]) => {
                  const hasPerm = permissions.includes(key);
                  return (
                    <label key={key} className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:border-primary-300"
                      style={{ borderColor: hasPerm ? 'var(--color-primary-500)' : '#e5e7eb', backgroundColor: hasPerm ? 'var(--color-primary-50)' : 'white' }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${hasPerm ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          <config.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-medium ${hasPerm ? 'text-primary-900' : 'text-neutral-700'}`}>{config.label}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        checked={hasPerm}
                        onChange={(e) => {
                          setPermissions(prev => 
                            e.target.checked 
                              ? [...prev, key]
                              : prev.filter(p => p !== key)
                          );
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={(!phone.trim() && !email.trim()) || (formMode === 'create' && (!fullName.trim() || !password || !phone.trim())) || isInviting}
              className="w-full md:w-auto shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {formMode === 'create' ? 'إنشاء حساب وإضافة المساعد' : 'إضافة المساعد'}
            </button>
          </div>
        </form>

        {error && <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">{error}</div>}
        {success && <div className="mt-4 p-4 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-100">{success}</div>}
      </div>
    </div>
  );
}
