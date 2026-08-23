'use client';

import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  DollarSign,
  Package,
  TrendingUp,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBooklets } from '../hooks/useBooklets';
import { Booklet } from '../types';
import { CreateBookletModal } from './CreateBookletModal';
import { EditBookletModal } from './EditBookletModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';

interface Props {
  groups?: Array<{ id: string; name: string; gradeLevel?: string }>;
}

export function BookletManagementSection({ groups = [] }: Props) {
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingBooklet, setEditingBooklet] = useState<Booklet | null>(null);

  const { booklets, isLoading, deleteBooklet, isDeleting } = useBooklets(
    selectedGrade !== 'ALL' ? { gradeLevel: selectedGrade } : undefined,
  );

  // Extract unique grades
  const gradeLevels = Array.from(new Set(booklets.map((b) => b.gradeLevel).filter(Boolean)));

  // Filter by search query
  const filteredBooklets = booklets.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchGrade = b.gradeLevel.toLowerCase().includes(q);
      const matchGroup = b.group?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchGrade && !matchGroup) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalBooklets = booklets.length;
  const activeBooklets = booklets.filter((b) => b.isActive).length;
  const totalCopiesSold = booklets.reduce((acc, b) => acc + (b.salesCount || 0), 0);
  const totalRevenue = booklets.reduce((acc, b) => acc + (b.totalRevenue || 0), 0);

  const [bookletToDelete, setBookletToDelete] = useState<Booklet | null>(null);

  const handleConfirmDelete = async () => {
    if (!bookletToDelete) return;
    try {
      await deleteBooklet(bookletToDelete.id);
      toast.success('تم حذف / إيقاف تفعيل المذكرة بنجاح');
      setBookletToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            إدارة المذكرات والملازم الدراسية
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            إنشاء مذكرات الشرح والتدريبات، تحديد أسعارها، وتحصيل قيمتها عبر QR والاشتراكات الشهرية
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-md shadow-purple-200 transition-all hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مذكرة جديدة</span>
        </Button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">إجمالي المذكرات</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalBooklets}</h3>
            <p className="text-xs text-purple-600 font-medium mt-0.5">{activeBooklets} متاحة للبيع</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">إجمالي التحصيلات</p>
            <h3 className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {totalRevenue.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">سداد مذكرات نقداً وعبر QR</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">النسخ المسددة</p>
            <h3 className="text-xl font-extrabold text-blue-700 mt-0.5">{totalCopiesSold}</h3>
            <p className="text-xs text-blue-600 font-medium mt-0.5">نسخة مستلمة من الطلاب</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">الصفوف المشمولة</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {gradeLevels.length || 1} <span className="text-xs font-normal">مراحل</span>
            </h3>
            <p className="text-xs text-amber-600 font-medium mt-0.5">مربوطة بالمجموعات</p>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="بحث باسم المذكرة أو الصف أو المجموعة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-right text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">تصفية الصف:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">جميع الصفوف الدراسية</option>
            {gradeLevels.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Booklets Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-sm">جاري تحميل قائمة المذكرات...</p>
          </div>
        ) : filteredBooklets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">لا توجد مذكرات مضافة حالياً</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              قم بإضافة مذكرات وملازم دراسية جديدة لتتمكن من تسجيل مبيعاتها وتحصيل قيمتها عبر مسح الـ QR.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-xl"
            >
              + إضافة أول مذكرة
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-600">
                  <th className="py-3.5 px-4">اسم المذكرة / الملزمة</th>
                  <th className="py-3.5 px-4">الصف والمجموعة</th>
                  <th className="py-3.5 px-4">السعر</th>
                  <th className="py-3.5 px-4">المخزن</th>
                  <th className="py-3.5 px-4">المبيعات</th>
                  <th className="py-3.5 px-4">إجمالي المحصل</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBooklets.map((booklet) => (
                  <tr key={booklet.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        {booklet.title}
                      </div>
                      <span className="text-xs text-slate-400 mr-4">
                        {booklet.academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'} • {booklet.academicYear || '2026-2027'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">{booklet.gradeLevel}</div>
                      <div className="text-xs text-slate-400">
                        {booklet.group?.name ? `مجموعة: ${booklet.group.name}` : 'جميع المجموعات'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700">{booklet.price} ج.م</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {booklet.stockCount !== null && booklet.stockCount !== undefined ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            booklet.stockCount > 10
                              ? 'bg-slate-100 text-slate-700'
                              : booklet.stockCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {booklet.stockCount === 0 ? 'نفد المخزون' : `${booklet.stockCount} نسخ`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">غير محدود</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-blue-700">{booklet.salesCount || 0}</span>{' '}
                      <span className="text-xs text-slate-400">طالب</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900">
                        {(booklet.totalRevenue || 0).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-500">ج.م</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {booklet.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" />
                          متاحة للبيع
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          موقوفة
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingBooklet(booklet)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="تعديل المذكرة"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setBookletToDelete(booklet)}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف / إيقاف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modals */}
      <CreateBookletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        groups={groups}
      />

      {editingBooklet && (
        <EditBookletModal
          isOpen={true}
          onClose={() => setEditingBooklet(null)}
          booklet={editingBooklet}
          groups={groups}
        />
      )}

      {/* Custom Confirmation Modal (No JS Confirm) */}
      <ConfirmModal
        isOpen={Boolean(bookletToDelete)}
        title="تأكيد حذف / إيقاف المذكرة"
        message={
          (bookletToDelete?.salesCount || 0) > 0
            ? `المذكرة "${bookletToDelete?.title}" لديها ${bookletToDelete?.salesCount} عمليات سداد سابقة. هل تريد إيقاف تفعيلها؟`
            : `هل أنت متأكد من حذف مذكرة "${bookletToDelete?.title}"؟`
        }
        confirmLabel="تأكيد الحذف / الإيقاف"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setBookletToDelete(null)}
      />
    </div>
  );
}
