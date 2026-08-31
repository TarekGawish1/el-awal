import React from 'react';
import Link from 'next/link';
import { QrCode, UserPlus, MessageSquare } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-3 sm:static sm:flex-row sm:w-full sm:mt-8">
      <Link href="/teacher/attendance" className="group">
        <button className="flex items-center justify-center w-14 h-14 sm:w-auto sm:h-12 sm:px-6 rounded-full sm:rounded-xl bg-neutral-900 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
          <QrCode className="w-6 h-6 sm:w-5 sm:h-5 sm:mr-2" />
          <span className="hidden sm:inline font-bold">تسجيل الحضور السريع</span>
        </button>
      </Link>
    </div>
  );
}
