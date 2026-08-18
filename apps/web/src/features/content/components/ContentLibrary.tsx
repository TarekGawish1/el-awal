'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  File,
  FileText,
  FileDown,
  Trash2,
  Video,
  AlertCircle,
  Calendar,
  Layers,
  BookOpen,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useContent, useDeleteContent } from '../hooks/use-content';
import { ContentType, EducationalContent } from '../types/content.types';
import { useAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { AcademicPeriodSwitcher } from '@/features/groups/components/AcademicPeriodSwitcher';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

const GRADE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'جميع الصفوف' },
  { value: 'الصف الأول الإعدادي', label: '1 إعدادي' },
  { value: 'الصف الثاني الإعدادي', label: '2 إعدادي' },
  { value: 'الصف الثالث الإعدادي', label: '3 إعدادي' },
  { value: 'الصف الأول الثانوي', label: '1 ثانوي' },
  { value: 'الصف الثاني الثانوي', label: '2 ثانوي' },
  { value: 'الصف الثالث الثانوي', label: '3 ثانوي' },
];

export function ContentLibrary({ onUploadClick }: { onUploadClick: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'ALL'>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  const { activeYear, activeTerm, isFilterActive, currentAcademicTerm, academicYears } = useAcademicPeriod();

  // Query content matching the active academic period and filters
  const queryParams: Record<string, string> = {};
  if (filterType !== 'ALL') queryParams.contentType = filterType;
  if (selectedGradeFilter !== 'ALL') queryParams.gradeLevel = selectedGradeFilter;
  if (activeYear) queryParams.academicYear = activeYear;
  if (activeTerm) queryParams.academicTerm = activeTerm;

  const { data: contents = [], isLoading, isError, error, refetch } = useContent(queryParams);
  const { mutate: deleteContent, isPending: isDeleting } = useDeleteContent();

  const filteredContents = contents.filter((content) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      content.title.toLowerCase().includes(query) ||
      (content.description && content.description.toLowerCase().includes(query)) ||
      (content.sessionTopic && content.sessionTopic.toLowerCase().includes(query)) ||
      (content.gradeLevel && content.gradeLevel.toLowerCase().includes(query)) ||
      (content.group?.name && content.group.name.toLowerCase().includes(query))
    );
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الملف "${title}"؟`)) {
      deleteContent(id, {
        onSuccess: () => toast.success('تم حذف الملف بنجاح'),
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الحذف'),
      });
    }
  };

  const getIcon = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE:
        return <File className="w-7 h-7 text-blue-500" />;
      case ContentType.SUMMARY:
        return <FileText className="w-7 h-7 text-emerald-500" />;
      case ContentType.REFERENCE:
        return <BookOpen className="w-7 h-7 text-purple-500" />;
      case ContentType.LECTURE_RECORDING:
        return <Video className="w-7 h-7 text-rose-500" />;
      default:
        return <File className="w-7 h-7 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE:
        return 'ملف / ملزمة';
      case ContentType.SUMMARY:
        return 'ملخص';
      case ContentType.REFERENCE:
        return 'مرجع / واجب';
      case ContentType.LECTURE_RECORDING:
        return 'تسجيل حصة';
      default:
        return 'ملف';
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'غير معروف';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">مكتبة ومرفقات الحصص</h1>
            <span className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full font-bold border border-primary-100">
              {contents.length} ملف
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            إدارة ورفع الملازم، ملخصات الدروس، ومرفقات الحصص للصفوف والمجموعات الدراسية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button onClick={onUploadClick} className="shadow-md shadow-primary/20 w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            رفع مرفق / ملزمة جديدة
          </Button>
        </div>
      </div>

      {/* Academic Period Switcher Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <AcademicPeriodSwitcher />
      </div>

      {/* Grade Level Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        {/* Grade Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
          <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">الصف الدراسي:</span>
          {GRADE_FILTER_OPTIONS.map((g) => (
            <button
              key={g.value}
              onClick={() => setSelectedGradeFilter(g.value)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
                selectedGradeFilter === g.value
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Search & Content Type dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              className="pr-10 bg-slate-50/50 border-slate-200"
              placeholder="ابحث باسم المرفق، الدرس، أو الحصة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-52 flex-shrink-0">
            <select
              className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">جميع أنواع الملفات</option>
              <option value={ContentType.FILE}>ملفات عامة وملازم</option>
              <option value={ContentType.SUMMARY}>ملخصات دراسية</option>
              <option value={ContentType.REFERENCE}>مراجع وواجبات</option>
              <option value={ContentType.LECTURE_RECORDING}>تسجيلات الحصص (فيديو)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid / States */}
      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل المرفقات</p>
            <p className="text-sm opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-48 flex flex-col justify-between">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
          <div className="mx-auto w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد مرفقات بعد لهذه الفترة</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">
            يمكنك رفع مذكرات وملفات الحصص الآن وستظهر لجميع طلاب المجموعات التابعة لهذا الصف تلقائياً.
          </p>
          <Button onClick={onUploadClick} className="shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 ml-2" />
            رفع أول مرفق للحصة
          </Button>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500 text-sm">لم يتم العثور على ملفات تطابق كلمات البحث أو الفلاتر المحددة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContents.map((content) => (
            <div
              key={content.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Header & Icon */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                    {getIcon(content.contentType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-1" title={content.title}>
                      {content.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {getTypeLabel(content.contentType)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{formatFileSize(content.fileSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Session Topic / Badge */}
                {content.sessionTopic && (
                  <div className="mb-3 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-800">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{content.sessionTopic}</span>
                  </div>
                )}

                {/* Description */}
                {content.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{content.description}</p>
                )}

                {/* Badges: Grade Level & Target Groups */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {content.gradeLevel && (
                    <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-500" />
                      {content.gradeLevel}
                    </span>
                  )}

                  {content.group ? (
                    <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-500" />
                      {content.group.name}
                    </span>
                  ) : content.gradeLevel ? (
                    <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      كل مجموعات الصف
                    </span>
                  ) : null}

                  {content.academicYear && (
                    <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                      {content.academicYear} • {content.academicTerm === 'SECOND_TERM' ? 'ترم 2' : 'ترم 1'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                <a
                  href={content.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center h-9 bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold rounded-xl transition-colors text-xs gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  فتح وتحميل المرفق
                </a>
                <button
                  onClick={() => handleDelete(content.id, content.title)}
                  disabled={isDeleting}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="حذف الملف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

