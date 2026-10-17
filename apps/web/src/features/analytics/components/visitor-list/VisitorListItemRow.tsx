'use client';

import React from 'react';
import {
  Users,
  Clock,
  Eye,
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  UserCheck,
  GraduationCap,
  Phone,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { VisitorListItem } from '../../types/analytics.types';

interface VisitorListItemRowProps {
  visitor: VisitorListItem;
  isExpanded: boolean;
  onToggleExpand: (hash: string) => void;
}

export function VisitorListItemRow({
  visitor,
  isExpanded,
  onToggleExpand,
}: VisitorListItemRowProps) {
  const isRegistered = !!visitor.user;
  const isStudent = visitor.user?.role === 'STUDENT';
  const isParent = visitor.user?.role === 'PARENT';

  const formatNumber = (num: number = 0) => new Intl.NumberFormat('en-US').format(num);

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'غير محدد';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('ar-EG-u-nu-latn', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getDeviceIcon = (device: 'Desktop' | 'Mobile' | 'Tablet') => {
    switch (device) {
      case 'Mobile':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'Tablet':
        return <Tablet className="w-3.5 h-3.5" />;
      default:
        return <Laptop className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isExpanded
          ? 'border-primary-300 bg-primary-50/20 shadow-sm ring-2 ring-primary-100'
          : isParent
          ? 'border-purple-200/80 bg-white hover:border-purple-300 hover:shadow-xs'
          : isStudent
          ? 'border-emerald-200/80 bg-white hover:border-emerald-300 hover:shadow-xs'
          : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-xs'
      }`}
    >
      {/* Main Row */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Visitor Info & Identity */}
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Avatar Icon */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isStudent
                ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200/60'
                : isParent
                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200/60'
                : isRegistered
                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200/60'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {isStudent ? (
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            ) : isParent ? (
              <Users className="w-6 h-6 text-purple-600" />
            ) : isRegistered ? (
              <UserCheck className="w-6 h-6 text-blue-600" />
            ) : (
              <Globe className="w-5 h-5 text-neutral-500" />
            )}
          </div>

          {/* Name, Code, City */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {isRegistered ? (
                <h3 className="text-sm sm:text-base font-black text-neutral-900 truncate">
                  {visitor.user?.name}
                </h3>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-neutral-800">زائر غير مسجل (Guest)</h3>
                  <span className="font-mono text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200">
                    #{visitor.shortHash}
                  </span>
                </div>
              )}

              {isStudent && (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-md border border-emerald-200/60 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-emerald-600" />
                  <span>طالب</span>
                </span>
              )}

              {isParent && (
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-black rounded-md border border-purple-200/60 flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-600" />
                  <span>
                    ولي أمر
                    {visitor.user?.parentInfo?.relationshipType
                      ? ` (${visitor.user.parentInfo.relationshipType})`
                      : ''}
                  </span>
                </span>
              )}

              {isRegistered && !isStudent && !isParent && (
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-black rounded-md border border-neutral-200">
                  مستخدم مسجل
                </span>
              )}

              {visitor.user?.studentCode && (
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold rounded-md">
                  {visitor.user.studentCode}
                </span>
              )}
            </div>

            {/* Parent child linkage badge */}
            {isParent && visitor.user?.parentInfo?.children && visitor.user.parentInfo.children.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {visitor.user.parentInfo.children.map((child, cIdx) => (
                  <span
                    key={cIdx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-900 text-xs font-semibold rounded-lg border border-purple-200/80 shadow-2xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>
                      ولي أمر الطالب:{' '}
                      <strong className="font-bold text-neutral-900">{child.studentName}</strong>
                    </span>
                    {child.gradeLevel && (
                      <span className="text-[11px] text-purple-700 font-medium">({child.gradeLevel})</span>
                    )}
                    {child.studentCode && (
                      <span className="font-mono text-[10px] text-purple-600 font-bold bg-white/80 px-1 rounded">
                        #{child.studentCode}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Meta subline: location, phone, grade */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  {visitor.city}، {visitor.country}
                </span>
              </span>

              {visitor.user?.phone && (
                <a
                  href={`https://wa.me/${visitor.user.phone.replace(/[^0-9+]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] text-neutral-700 hover:text-emerald-700 hover:underline bg-neutral-50 hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-neutral-200/60 transition-colors"
                  title="مراسلة عبر واتساب أو اتصال"
                >
                  <Phone className="w-3 h-3 text-neutral-400" />
                  <bdi>{visitor.user.phone}</bdi>
                </a>
              )}

              {visitor.user?.gradeLevel && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{visitor.user.gradeLevel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges: Environment & Total Visits */}
        <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100">
          {/* Device & OS Badges */}
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold"
              title={`${visitor.device} - ${visitor.os}`}
            >
              {getDeviceIcon(visitor.device)}
              <span>{visitor.os}</span>
            </span>
            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-medium">
              {visitor.browser}
            </span>
          </div>

          {/* Visit Count, Duration & Timing */}
          <div className="text-end">
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-xl text-xs font-black border border-primary-100">
                <Eye className="w-3.5 h-3.5" />
                <span>{formatNumber(visitor.totalVisits)} زيارة</span>
              </div>
              {visitor.totalDurationFormatted && (
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl text-xs font-black border border-amber-200/60"
                  title="إجمالي وقت التواجد للزائر على المنصة"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>إجمالي التواجد: {visitor.totalDurationFormatted}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1" title={visitor.lastSeenAt}>
              آخر ظهور: {formatDateTime(visitor.lastSeenAt)}
            </p>
          </div>

          {/* Expand Button */}
          <button
            type="button"
            onClick={() => onToggleExpand(visitor.visitorHash)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              isExpanded
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
            }`}
          >
            <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer: Individual Visits Log */}
      {isExpanded && (
        <div className="border-t border-neutral-200/80 bg-neutral-50/70 p-4 sm:p-5 rounded-b-2xl space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <h4 className="text-xs sm:text-sm font-black text-neutral-900">
                سجل الزيارات والصفحات التي تمت مشاهدتها ({visitor.visits.length} مسار)
              </h4>
            </div>
            <div className="text-[11px] text-neutral-500">
              أول زيارة مسجلة: {formatDateTime(visitor.firstSeenAt)}
            </div>
          </div>

          {/* Timeline of visits */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {visitor.visits.map((visit, index) => (
              <div
                key={visit.id || index}
                className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-neutral-900 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60 truncate max-w-xs sm:max-w-md">
                        {visit.path}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          visit.isLandingPage
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {visit.isLandingPage ? 'موقع تعريفي' : 'بوابة النظام'}
                      </span>
                    </div>
                    {visit.referrer && (
                      <p className="text-[10px] text-neutral-400 mt-1 truncate">
                        المصدر: {visit.referrer}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-end shrink-0 flex flex-col items-end gap-1 self-end sm:self-auto">
                  {visit.durationFormatted && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[11px] font-bold border border-amber-200/60"
                      title="مدة هذه الزيارة المحددة"
                    >
                      <Clock className="w-3 3.5 h-3 text-amber-600" />
                      <span>{visit.durationFormatted}</span>
                    </span>
                  )}
                  <span className="text-neutral-500 font-mono text-[11px]">
                    {formatDateTime(visit.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
