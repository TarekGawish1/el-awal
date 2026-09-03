'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Trash2,
  Search,
  RefreshCw,
  MessageSquare,
  Clock,
  MessageCircle,
  AlertCircle,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InquiriesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch inquiries safely unwrapping either raw array or { success: true, data: [...] }
  const {
    data: inquiries = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ContactMessage[]>({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const res = await apiClient<any>(API_ENDPOINTS.CONTACT_MESSAGES.LIST);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
    staleTime: 30000,
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(API_ENDPOINTS.CONTACT_MESSAGES.MARK_READ(id), {
        method: 'PATCH',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contact-messages'] });
      const previous = queryClient.getQueryData<ContactMessage[]>(['contact-messages']);
      if (previous) {
        queryClient.setQueryData<ContactMessage[]>(
          ['contact-messages'],
          previous.map((msg) => (msg.id === id ? { ...msg, isRead: true } : msg))
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['contact-messages'], context.previous);
      }
      toast.error('حدث خطأ أثناء تحديث حالة الرسالة');
    },
    onSuccess: () => {
      toast.success('تم تحديد الرسالة كمقروءة');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(API_ENDPOINTS.CONTACT_MESSAGES.DELETE(id), {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contact-messages'] });
      const previous = queryClient.getQueryData<ContactMessage[]>(['contact-messages']);
      if (previous) {
        queryClient.setQueryData<ContactMessage[]>(
          ['contact-messages'],
          previous.filter((msg) => msg.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['contact-messages'], context.previous);
      }
      toast.error('حدث خطأ أثناء حذف الرسالة');
    },
    onSuccess: () => {
      toast.success('تم حذف الرسالة بنجاح');
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((msg) => {
      const matchesSearch =
        searchQuery === '' ||
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.phone.includes(searchQuery) ||
        msg.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UNREAD' && !msg.isRead) ||
        (statusFilter === 'READ' && msg.isRead);

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  const totalCount = inquiries.length;
  const unreadCount = inquiries.filter((m) => !m.isRead).length;
  const readCount = totalCount - unreadCount;

  const getWhatsAppUrl = (phone: string, name: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '2' + clean;
    else if (!clean.startsWith('20') && clean.length === 10) clean = '20' + clean;
    const text = encodeURIComponent(`مرحباً أستاذ ${name}، بخصوص استفسارك على منصة الأول:`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-500 to-indigo-600"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <Mail className="w-7 h-7 text-primary-600" />
              رسائل الموقع والاستفسارات
            </h1>
            <p className="mt-1 sm:mt-2 text-slate-500 text-sm sm:text-base">
              عرض الرسائل والطلبات الواردة من نموذج "اتصل بنا" في الصفحة الرئيسية والتواصل الفوري مع أصحابها
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 bg-white"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-primary-600' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-100 text-center sm:text-right">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium block mb-1">إجمالي الرسائل</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800">{totalCount}</span>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <span className="text-xs text-amber-700 font-medium block mb-1">جديدة (غير مقروءة)</span>
            <span className="text-xl sm:text-2xl font-black text-amber-800">{unreadCount}</span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <span className="text-xs text-emerald-700 font-medium block mb-1">تمت مراجعتها</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800">{readCount}</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10 w-full bg-slate-50/70 border-slate-200"
            placeholder="ابحث بالاسم، الهاتف، أو نص الرسالة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full md:w-auto shadow-xs border border-slate-200/50">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'UNREAD', label: `غير مقروءة (${unreadCount})` },
            { id: 'READ', label: 'تمت قراءتها' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as 'ALL' | 'UNREAD' | 'READ')}
              className={`flex-1 md:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 rounded w-40"></div>
                <div className="h-4 bg-slate-100 rounded w-24"></div>
              </div>
              <div className="h-4 bg-slate-100 rounded w-64"></div>
              <div className="h-16 bg-slate-50 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-bold text-lg">فشل في تحميل الرسائل</h3>
          <p className="text-sm opacity-90">
            {(error as any)?.message || 'يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="bg-white">
            إعادة المحاولة
          </Button>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {searchQuery || statusFilter !== 'ALL' ? 'لا توجد رسائل مطابقة لخيارات البحث' : 'لا توجد رسائل حالياً'}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery || statusFilter !== 'ALL'
              ? 'جرّب تغيير كلمات البحث أو إزالة الفلاتر المحددة'
              : 'سيتم عرض أي رسائل استفسار جديدة من زوار المنصة هنا فور إرسالها'}
          </p>
          {(searchQuery || statusFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-4 bg-white"
            >
              إعادة تعيين الفلاتر
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
                !msg.isRead
                  ? 'border-primary-300 ring-2 ring-primary-500/10 bg-gradient-to-r from-primary-50/20 to-white'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      !msg.isRead ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {msg.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg">{msg.name}</h3>
                      {!msg.isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                          جديد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium inline-flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                          تمت المراجعة
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">
                          {new Date(msg.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Contacts */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <a
                    href={`tel:${msg.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span dir="ltr">{msg.phone}</span>
                  </a>

                  <a
                    href={getWhatsAppUrl(msg.phone, msg.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    title="تواصل واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>واتساب</span>
                  </a>
                </div>
              </div>

              {/* Message Body */}
              <div className="mt-4 p-4 bg-slate-50/80 rounded-xl text-slate-800 text-sm sm:text-base leading-relaxed border border-slate-100">
                <p className="whitespace-pre-line">{msg.message}</p>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  {!msg.isRead && (
                    <button
                      type="button"
                      disabled={markAsReadMutation.isPending}
                      onClick={() => markAsReadMutation.mutate(msg.id)}
                      className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-bold hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      تحديد كمقروء
                    </button>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    disabled={deletingId === msg.id}
                    onClick={() => handleDelete(msg.id)}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === msg.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    حذف الرسالة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
