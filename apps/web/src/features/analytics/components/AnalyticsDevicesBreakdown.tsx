'use client';

import React, { useState } from 'react';
import { Laptop, Smartphone, Tablet, Info } from 'lucide-react';

interface AnalyticsDevicesBreakdownProps {
  topPages?: Array<{
    path: string;
    views: number;
    percentage: number;
    isLandingPage: boolean;
  }>;
  devices?: Array<{
    device: string;
    count: number;
    percentage: number;
    labelAr: string;
  }>;
  osBreakdown?: Array<{
    os: string;
    count: number;
    percentage: number;
    labelAr: string;
  }>;
  browserBreakdown?: Array<{
    browser: string;
    count: number;
    percentage: number;
    labelAr: string;
  }>;
  formatNumber: (num?: number) => string;
}

export function AnalyticsDevicesBreakdown({
  topPages,
  devices,
  osBreakdown,
  browserBreakdown,
  formatNumber,
}: AnalyticsDevicesBreakdownProps) {
  const [deviceTab, setDeviceTab] = useState<'device' | 'os' | 'browser'>('device');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top Visited Pages (2 Cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">أكثر الصفحات زيارة</h2>
            <p className="text-xs text-neutral-500">
              المسارات الأكثر طلباً وتردداً من الزوار والمستخدمين
            </p>
          </div>
        </div>

        {topPages && topPages.length > 0 ? (
          <div className="space-y-3">
            {topPages.map((page, idx) => (
              <div
                key={page.path}
                className="p-3 bg-neutral-50/80 hover:bg-neutral-50 rounded-xl border border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-neutral-200/80 text-neutral-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-bold text-neutral-900 truncate dir-ltr text-end sm:text-start"
                      dir="ltr"
                    >
                      {page.path}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          page.isLandingPage
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}
                      >
                        {page.isLandingPage ? 'صفحة تعريفية' : 'لوحة النظام'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="w-28 h-2 bg-neutral-200 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-primary-600 rounded-full"
                      style={{ width: `${page.percentage}%` }}
                    />
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-black text-neutral-900">
                      {formatNumber(page.views)}
                      <span className="text-xs font-normal text-neutral-500 mr-1">زيارة</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">{page.percentage}% من الإجمالي</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-neutral-400">
            لا توجد صفحات مسجلة حتى الآن
          </div>
        )}
      </div>

      {/* Device Breakdown (1 Col) — with OS + Browser sub-tabs */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">الأجهزة والمتصفحات</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              توزيع الزوار حسب نوع الجهاز ونظام التشغيل والمتصفح
            </p>
          </div>
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
            {(['device', 'os', 'browser'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDeviceTab(tab)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  deviceTab === tab
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab === 'device' ? 'نوع الجهاز' : tab === 'os' ? 'نظام التشغيل' : 'المتصفح'}
              </button>
            ))}
          </div>
        </div>

        {/* Device Type tab */}
        {deviceTab === 'device' && (
          <div className="space-y-3 pt-1">
            {devices &&
              devices.map((device) => {
                const Icon =
                  device.device === 'Desktop'
                    ? Laptop
                    : device.device === 'Mobile'
                    ? Smartphone
                    : Tablet;
                const color =
                  device.device === 'Desktop'
                    ? 'bg-primary-600'
                    : device.device === 'Mobile'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500';
                const textColor =
                  device.device === 'Desktop'
                    ? 'text-primary-700'
                    : device.device === 'Mobile'
                    ? 'text-emerald-700'
                    : 'text-amber-700';
                const bgColor =
                  device.device === 'Desktop'
                    ? 'bg-primary-50'
                    : device.device === 'Mobile'
                    ? 'bg-emerald-50'
                    : 'bg-amber-50';
                return (
                  <div
                    key={device.device}
                    className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 ${bgColor} ${textColor} rounded-lg`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{device.labelAr}</p>
                          <p className="text-[11px] text-neutral-400">{device.device}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-black text-neutral-900">{device.percentage}%</p>
                        <p className="text-[10px] text-neutral-500">{formatNumber(device.count)} زيارة</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${device.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* OS tab */}
        {deviceTab === 'os' && (
          <div className="space-y-3 pt-1">
            {osBreakdown && osBreakdown.length > 0 ? (
              osBreakdown.map((item) => {
                const osColors: Record<string, string> = {
                  Android: 'bg-green-500',
                  iOS: 'bg-neutral-800',
                  Windows: 'bg-blue-500',
                  macOS: 'bg-slate-500',
                  Linux: 'bg-orange-500',
                  Other: 'bg-neutral-400',
                };
                const osBg: Record<string, string> = {
                  Android: 'bg-green-50 text-green-700',
                  iOS: 'bg-neutral-100 text-neutral-700',
                  Windows: 'bg-blue-50 text-blue-700',
                  macOS: 'bg-slate-50 text-slate-700',
                  Linux: 'bg-orange-50 text-orange-700',
                  Other: 'bg-neutral-50 text-neutral-600',
                };
                return (
                  <div
                    key={item.os}
                    className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            osBg[item.os] || 'bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {item.os}
                        </div>
                        <p className="text-sm font-bold text-neutral-900">{item.labelAr}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-black text-neutral-900">{item.percentage}%</p>
                        <p className="text-[10px] text-neutral-500">{formatNumber(item.count)} زيارة</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${osColors[item.os] || 'bg-neutral-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                لا توجد بيانات نظام تشغيل بعد
              </div>
            )}
          </div>
        )}

        {/* Browser tab */}
        {deviceTab === 'browser' && (
          <div className="space-y-3 pt-1">
            {browserBreakdown && browserBreakdown.length > 0 ? (
              browserBreakdown.map((item) => {
                const browserColors: Record<string, string> = {
                  Chrome: 'bg-yellow-500',
                  Safari: 'bg-blue-500',
                  Firefox: 'bg-orange-500',
                  Edge: 'bg-sky-600',
                  Opera: 'bg-red-500',
                  Other: 'bg-neutral-400',
                };
                const browserBg: Record<string, string> = {
                  Chrome: 'bg-yellow-50 text-yellow-700',
                  Safari: 'bg-blue-50 text-blue-700',
                  Firefox: 'bg-orange-50 text-orange-700',
                  Edge: 'bg-sky-50 text-sky-700',
                  Opera: 'bg-red-50 text-red-700',
                  Other: 'bg-neutral-50 text-neutral-600',
                };
                return (
                  <div
                    key={item.browser}
                    className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`px-2 py-1 rounded-lg text-[11px] font-black ${
                            browserBg[item.browser] || 'bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {item.browser}
                        </div>
                        <p className="text-sm font-bold text-neutral-900">{item.labelAr}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-black text-neutral-900">{item.percentage}%</p>
                        <p className="text-[10px] text-neutral-500">{formatNumber(item.count)} زيارة</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${browserColors[item.browser] || 'bg-neutral-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                لا توجد بيانات متصفحات بعد
              </div>
            )}
          </div>
        )}

        {/* Privacy Note Footer */}
        <div className="mt-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            جميع التقديرات وحساب الزوار تعتمد على بصمة تشفير SHA-256 متوافقة مع معايير حماية الخصوصية
            GDPR، دون حفظ أي عناوين IP صريحة.
          </p>
        </div>
      </div>
    </div>
  );
}
