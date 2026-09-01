import React, { useState } from 'react';
import { useAssistants } from '../hooks/useAssistants';
import { UserPlus, Mail, Phone, Loader2 } from 'lucide-react';

export function InviteAssistantForm() {
  const { inviteAssistant, isInviting } = useAssistants();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setError('');
    setSuccess('');

    try {
      await inviteAssistant({ [method]: value.trim() });
      setSuccess('تم إضافة المساعد بنجاح!');
      setValue('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء دعوة المساعد. تأكد من أن المستخدم مسجل كـ "سكرتارية".');
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
          <p className="text-sm text-neutral-500 mt-1">قم بدعوة مساعدين لمعاونتك في إدارة المجموعات، الحضور، والماليات. يجب أن يكون لدى المساعد حساب سكرتارية مسجل مسبقاً.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-start md:items-end gap-4">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer">
              <input type="radio" name="method" checked={method === 'phone'} onChange={() => setMethod('phone')} className="text-primary-600 focus:ring-primary-500" />
              رقم الهاتف
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer">
              <input type="radio" name="method" checked={method === 'email'} onChange={() => setMethod('email')} className="text-primary-600 focus:ring-primary-500" />
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
        <button
          type="submit"
          disabled={!value.trim() || isInviting}
          className="w-full md:w-auto shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          إضافة المساعد
        </button>
      </form>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{error}</div>}
      {success && <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm font-medium rounded-lg border border-green-100">{success}</div>}
    </div>
  );
}
