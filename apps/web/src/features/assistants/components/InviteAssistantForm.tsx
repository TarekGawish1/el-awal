import React, { useState } from 'react';
import { useAssistants } from '../hooks/useAssistants';
import { UserPlus, Mail, Phone, Loader2, Info } from 'lucide-react';

export function InviteAssistantForm() {
  const { inviteAssistant, isInviting } = useAssistants();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  
  // Account Creation State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setError('');
    setSuccess('');

    try {
      const payload: any = { [method]: value.trim() };
      
      if (showCreateForm) {
        if (!fullName.trim() || !password) {
          setError('يرجى إدخال اسم المساعد وكلمة المرور لإنشاء الحساب.');
          return;
        }
        payload.fullName = fullName.trim();
        payload.password = password;
      }

      await inviteAssistant(payload);
      
      setSuccess('تم إضافة المساعد بنجاح!');
      setValue('');
      setFullName('');
      setPassword('');
      setShowCreateForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      
      // If the user doesn't exist, prompt them to create one
      if (err.response?.status === 404 || errorMessage.includes('No user found')) {
        setShowCreateForm(true);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-800">إضافة مساعد جديد</h2>
          <p className="text-sm text-neutral-500 mt-1">قم بدعوة مساعدين لمعاونتك في إدارة المجموعات، الحضور، والماليات.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer">
                <input type="radio" name="method" checked={method === 'phone'} onChange={() => { setMethod('phone'); setShowCreateForm(false); }} className="text-primary-600 focus:ring-primary-500" />
                رقم الهاتف
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer">
                <input type="radio" name="method" checked={method === 'email'} onChange={() => { setMethod('email'); setShowCreateForm(false); }} className="text-primary-600 focus:ring-primary-500" />
                البريد الإلكتروني
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                {method === 'phone' ? <Phone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>
              <input
                type={method === 'phone' ? 'tel' : 'email'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={method === 'phone' ? 'أدخل رقم هاتف المساعد...' : 'أدخل البريد الإلكتروني للمساعد...'}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl pr-10 pl-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                dir="ltr"
              />
            </div>
          </div>
          
          {!showCreateForm && (
            <button
              type="submit"
              disabled={!value.trim() || isInviting}
              className="w-full md:w-auto shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              إضافة المساعد
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 mt-2 animate-fade-in space-y-4">
            <div className="flex items-center gap-2 text-primary-700 mb-2">
              <Info className="w-5 h-5" />
              <p className="text-sm font-bold">هذا الحساب غير مسجل. يرجى إدخال البيانات لإنشاء حساب مساعد جديد.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">الاسم الكامل للمساعد</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full bg-white border border-neutral-300 text-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">كلمة المرور المؤقتة</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية"
                  className="w-full bg-white border border-neutral-300 text-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={!value.trim() || !fullName.trim() || !password || isInviting}
                className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                إنشاء حساب وإضافة المساعد
              </button>
            </div>
          </div>
        )}
      </form>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{error}</div>}
      {success && <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm font-medium rounded-lg border border-green-100">{success}</div>}
    </div>
  );
}
