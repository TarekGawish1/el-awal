import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'منصة الأول التعليمية',
    short_name: 'الأول',
    description: 'نظام إدارة التعليم وحصص الحضور الذكي والتقييمات للطلاب والمدرسين',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F8FAFC',
    theme_color: '#1E4BD9',
    dir: 'rtl',
    lang: 'ar',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'رصد الحضور الذكي',
        short_name: 'التحضير',
        description: 'مسح QR كود الطلاب وتسجيل الحضور فورياً',
        url: '/teacher/attendance',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'جدول الحصص',
        short_name: 'الجدول',
        description: 'عرض مواعيد وحصص اليوم والمجموعات',
        url: '/teacher/schedules',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'سجل الطلاب',
        short_name: 'الطلاب',
        description: 'قائمة الطلاب والدرجات والبيانات',
        url: '/teacher/students',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'لوحة التحكم',
        short_name: 'الرئيسية',
        description: 'نظرة عامة على الإحصائيات والحصص القادمة',
        url: '/teacher/dashboard',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
