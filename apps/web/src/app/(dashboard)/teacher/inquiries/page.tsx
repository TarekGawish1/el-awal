import React from 'react';
import { Mail, Phone, Calendar, CheckCircle, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getInquiries() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/contact-messages`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default async function InquiriesPage() {
  const inquiries = await getInquiries();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">رسائل الموقع والاستفسارات</h1>
          <p className="text-slate-500 mt-1">عرض الرسائل المرسلة من نموذج "اتصل بنا" في الصفحة الرئيسية</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {inquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium">لا توجد رسائل حالياً</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inquiries.map((msg: any) => (
              <div key={msg.id} className={`p-6 transition-colors ${msg.isRead ? 'bg-white' : 'bg-blue-50/50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      {msg.name}
                      {!msg.isRead && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">جديد</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span dir="ltr">{msg.phone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(msg.createdAt).toLocaleDateString('ar-EG')}</span>
                      </span>
                    </div>
                  </div>
                  {/* Future: Add mark as read and delete actions here. 
                      Since this is an RSC, we'd need a Client Component for interactivity,
                      or Server Actions. For now, we display them.
                   */}
                </div>
                <div className="mt-4 p-4 bg-slate-50 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100">
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
