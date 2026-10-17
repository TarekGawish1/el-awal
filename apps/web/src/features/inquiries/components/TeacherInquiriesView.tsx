'use client';

import React from 'react';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTeacherInquiries } from '../hooks/useTeacherInquiries';
import { InquiryCard } from './InquiryCard';

export function TeacherInquiriesView() {
  const {
    filteredInquiries,
    totalCount,
    unreadCount,
    readCount,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    markAsRead,
    isMarkingRead,
    deleteMessage,
    deletingId,
  } = useTeacherInquiries();

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
              عرض الرسائل والطلبات الواردة من نموذج &quot;اتصل بنا&quot; في الصفحة الرئيسية والتواصل الفوري مع أصحابها
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
          <Input
            className="w-full bg-slate-50/70 border-slate-200"
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
            <InquiryCard
              key={msg.id}
              message={msg}
              onMarkAsRead={markAsRead}
              isMarkingRead={isMarkingRead}
              onDelete={deleteMessage}
              isDeleting={deletingId === msg.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
