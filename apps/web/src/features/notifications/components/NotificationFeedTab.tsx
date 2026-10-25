'use client';

import React from 'react';
import {
  Bell,
  Search,
  CheckCheck,
  RefreshCw,
  Loader2,
  GraduationCap,
  HeartHandshake,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/Skeleton';

export interface NotificationFeedTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  roleFilter: 'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT';
  setRoleFilter: (role: 'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT') => void;
  readFilter: 'ALL' | 'UNREAD' | 'READ';
  setReadFilter: (status: 'ALL' | 'UNREAD' | 'READ') => void;
  unreadCount: number;
  markAllRead: any;
  refetchFeed: () => void;
  isFeedLoading: boolean;
  filteredNotifications: Notification[];
  notifications: Notification[];
  totalCount: number;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  markRead: any;
}

export function NotificationFeedTab({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  readFilter,
  setReadFilter,
  unreadCount,
  markAllRead,
  refetchFeed,
  isFeedLoading,
  filteredNotifications,
  notifications,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  pageSize,
  setPageSize,
  markRead,
}: NotificationFeedTabProps) {
  const getRecipientBadge = (recipient?: { fullName: string; role: string }) => {
    if (!recipient) return null;
    switch (recipient.role) {
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <GraduationCap size={12} />
            <span>الطالب: {recipient.fullName}</span>
          </span>
        );
      case 'PARENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <HeartHandshake size={12} />
            <span>ولي الأمر: {recipient.fullName}</span>
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <UserCheck size={12} />
            <span>المعلم: {recipient.fullName}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>{recipient.fullName}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
      {/* Top filter toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="بحث في العنوان، المحتوى، أو اسم المستلم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Audience Role Filter & Read Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role filter buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('TEACHER')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'TEACHER' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              المعلم
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('STUDENT')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'STUDENT' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              الطلاب
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('PARENT')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'PARENT' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              أولياء الأمور
            </button>
          </div>

          {/* Read/Unread filter buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setReadFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                readFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              جميع الحالات
            </button>
            <button
              type="button"
              onClick={() => setReadFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                readFilter === 'UNREAD' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">تحديد الكل كمقروء</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refetchFeed()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="تحديث السجل"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* List of notifications */}
      <div className="divide-y divide-slate-100">
        {isFeedLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-72 rounded max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-3 w-16 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="text-slate-300 mx-auto mb-2" size={32} />
            <p className="text-sm font-bold text-slate-700">لا توجد إشعارات مطابقة</p>
            <p className="text-xs text-slate-400 mt-1">
              لم يتم العثور على أي إشعارات مطابقة لمعايير الفلترة الحالية.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead.mutate(n.id)}
              className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer rounded-xl my-1 ${
                n.isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-blue-50/40 hover:bg-blue-50/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Bell size={16} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`text-sm font-bold ${
                        n.isRead ? 'text-slate-700' : 'text-slate-900'
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                    )}
                    {getRecipientBadge(n.recipient)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString('ar-EG')}
                    </span>
                    {n.channels && n.channels.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        • القنوات: {n.channels.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markRead.mutate(n.id);
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors shrink-0 cursor-pointer"
                >
                  تحديد كمقروء
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {notifications.length > 0 && (
        <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700">
              تم عرض <span className="font-bold text-blue-600">{filteredNotifications.length}</span>
              {totalCount > filteredNotifications.length && (
                <> من أصل <span className="font-bold text-slate-900">{totalCount}</span></>
              )} إشعار
            </span>
            {hasNextPage && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                • يتوفر المزيد من الصفحات
              </span>
            )}
            {/* Page Size Selector */}
            <div className="flex items-center gap-1 mr-2 text-[11px] text-slate-500">
              <span>عرض:</span>
              {[15, 30, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    pageSize === size
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasNextPage ? (
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري تحميل الإشعارات السابقة...</span>
                  </>
                ) : (
                  <>
                    <span>تحميل المزيد من الإشعارات السابقة</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            ) : (
              <span className="text-slate-500 font-medium bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-center w-full sm:w-auto">
                ✓ تم تحميل جميع الإشعارات المتاحة ({totalCount})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
