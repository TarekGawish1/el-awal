import { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Award, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const metadata: Metadata = {
  title: 'الشهادات | منصة الأول',
  description: 'إدارة وإنشاء شهادات الطلاب',
};

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">الشهادات</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وإدارة شهادات التقدير لطلابك</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/teacher/certificates/new" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء شهادة
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن شهادة..."
          />
        </div>
      </div>

      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد شهادات بعد</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          قم بإنشاء شهادتك الأولى لتبدأ في تقدير طلابك المتميزين وتشجيعهم.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/teacher/certificates/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء شهادة جديدة
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
