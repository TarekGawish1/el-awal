'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  File,
  FileText,
  FileDown,
  Trash2,
  Edit2,
  Video,
  Play,
  AlertCircle,
  Calendar,
  Layers,
  BookOpen,
  Users,
  Clock,
  Sparkles,
  RotateCcw,
  Filter,
  X,
} from 'lucide-react';
import { useContent, useDeleteContent } from '../hooks/use-content';
import { ContentType, EducationalContent } from '../types/content.types';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { EditContentModal } from './EditContentModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

const BASE_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2027-2028', '2028-2029', '2023-2024'];

const GRADE_OPTIONS = [
  { value: 'ALL', label: 'جميع الصفوف الدراسية' },
  { value: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي' },
  { value: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي' },
  { value: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي' },
  { value: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي' },
  { value: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي' },
  { value: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي' },
  { value: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي' },
  { value: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي' },
  { value: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي' },
  { value: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي' },
  { value: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي' },
  { value: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي' },
];

const TERM_OPTIONS = [
  { value: 'ALL', label: 'جميع الفصول الدراسية' },
  { value: 'FIRST_TERM', label: 'الفصل الدراسي الأول (ترم أول)' },
  { value: 'SECOND_TERM', label: 'الفصل الدراسي الثاني (ترم ثانٍ)' },
];

const STAGE_OPTIONS = [
  { value: 'ALL', label: 'جميع المراحل الدراسية' },
  { value: 'PRIMARY', label: 'المرحلة الابتدائية' },
  { value: 'PREPARATORY', label: 'المرحلة الإعدادية' },
  { value: 'SECONDARY', label: 'المرحلة الثانوية' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'جميع أنواع الملفات' },
  { value: ContentType.FILE, label: 'ملفات عامة وملازم' },
  { value: ContentType.SUMMARY, label: 'ملخصات دراسية' },
  { value: ContentType.REFERENCE, label: 'مراجع وواجبات' },
  { value: ContentType.LECTURE_RECORDING, label: 'تسجيلات الحصص (فيديو)' },
];

function getAcademicStage(gradeLevel?: string | null): string {
  if (!gradeLevel) return '';
  if (gradeLevel.includes('الابتدائي')) return 'PRIMARY';
  if (gradeLevel.includes('الإعدادي')) return 'PREPARATORY';
  if (gradeLevel.includes('الثانوي')) return 'SECONDARY';
  return '';
}

export function ContentLibrary({ onUploadClick }: { onUploadClick: () => void }) {
  const isOnline = useOnlineStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editingContent, setEditingContent] = useState<EducationalContent | null>(null);
  const [playingVideo, setPlayingVideo] = useState<EducationalContent | null>(null);

  const PAGE_SIZE = 12;

  const { data: groups = [] } = useGroups();
  const { activeYear } = useStoredAcademicPeriod(groups as any);

  // Build query parameters for server filtering
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedType !== 'ALL') params.contentType = selectedType;
    if (selectedGrade !== 'ALL') params.gradeLevel = selectedGrade;
    if (selectedYear !== 'ALL') params.academicYear = selectedYear;
    if (selectedTerm !== 'ALL') params.academicTerm = selectedTerm;
    return params;
  }, [selectedType, selectedGrade, selectedYear, selectedTerm]);

  const { data: contents = [], isLoading, isError, error, refetch } = useContent(queryParams);
  const { mutate: deleteContent, isPending: isDeleting } = useDeleteContent();

  const gradeOptionsForStage = useMemo(
    () => GRADE_OPTIONS.filter((option) => option.value === 'ALL' || selectedStage === 'ALL' || getAcademicStage(option.value) === selectedStage),
    [selectedStage],
  );

  // Dynamic Academic Years options including all preset years + actual content/group years
  const academicYearOptions = useMemo(() => {
    const yearsSet = new Set<string>(BASE_YEARS);
    if (activeYear) yearsSet.add(activeYear);
    if (Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.academicYear && g.academicYear.trim()) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }
    if (Array.isArray(contents)) {
      contents.forEach((c) => {
        if (c.academicYear && c.academicYear.trim()) {
          yearsSet.add(c.academicYear.trim());
        }
      });
    }

    const sortedYears = Array.from(yearsSet).sort().reverse();
    return [
      { value: 'ALL', label: 'جميع الأعوام الدراسية' },
      ...sortedYears.map((yr) => ({
        value: yr,
        label: `العام الدراسي ${yr}`,
      })),
    ];
  }, [groups, contents, activeYear]);

  // Client-side filtering for search and the broader academic-stage filter.
  const filteredContents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return contents.filter((content) => {
      const matchesSearch = !query || (
        content.title.toLowerCase().includes(query) ||
        (content.description && content.description.toLowerCase().includes(query)) ||
        (content.sessionTopic && content.sessionTopic.toLowerCase().includes(query)) ||
        (content.gradeLevel && content.gradeLevel.toLowerCase().includes(query)) ||
        (content.group?.name && content.group.name.toLowerCase().includes(query))
      );
      const matchesStage = selectedStage === 'ALL' || getAcademicStage(content.gradeLevel) === selectedStage;
      return matchesSearch && matchesStage;
    });
  }, [contents, searchQuery, selectedStage]);

  const totalPages = Math.ceil(filteredContents.length / PAGE_SIZE);

  const paginatedContents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredContents.slice(start, start + PAGE_SIZE);
  }, [filteredContents, currentPage]);

  const isFiltered =
    searchQuery !== '' ||
    selectedYear !== 'ALL' ||
    selectedTerm !== 'ALL' ||
    selectedStage !== 'ALL' ||
    selectedGrade !== 'ALL' ||
    selectedType !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedYear('ALL');
    setSelectedTerm('ALL');
    setSelectedStage('ALL');
    setSelectedGrade('ALL');
    setSelectedType('ALL');
  };

  const [contentToDelete, setContentToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = (id: string, title: string) => {
    setContentToDelete({ id, title });
  };

  const handleConfirmDelete = () => {
    if (!contentToDelete) return;
    deleteContent(contentToDelete.id, {
      onSuccess: () => {
        toast.success('تم حذف الملف بنجاح');
        setContentToDelete(null);
      },
      onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الحذف'),
    });
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
        return 'تسجيل حصة (فيديو)';
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
            إدارة ورفع الملازم، ملخصات الدروس، ومرفقات الحصص للصفوف والمجموعات الدراسية مع دعم تشغيل الفيديو بجودة عالية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <span title={!isOnline ? 'يتطلب رفع المرفقات اتصالاً بالإنترنت' : undefined} className="w-full sm:w-auto">
            <Button onClick={onUploadClick} disabled={!isOnline} className="shadow-md shadow-primary/20 w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-2" />
              رفع مرفق / ملزمة جديدة
            </Button>
          </span>
        </div>
      </div>

      {/* Unified Filter Toolbar with Dropdown Lists */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-primary-600" />
            <span>تصفية المرفقات والملفات:</span>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-center">
          {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-4 xl:col-span-2 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="search"
              className="pr-9 h-10 bg-slate-50/70 border-slate-200 text-xs sm:text-sm rounded-xl focus:bg-white"
              placeholder="ابحث باسم المرفق أو الدرس..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Academic Year Dropdown */}
          <div>
            <Select
              aria-label="اختيار العام الدراسي"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={academicYearOptions}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          {/* Academic Term Dropdown */}
          <div>
            <Select
              aria-label="اختيار الفصل الدراسي"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              options={TERM_OPTIONS}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          {/* Academic Stage Dropdown */}
          <div>
            <Select
              aria-label="اختيار المرحلة الدراسية"
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setSelectedGrade('ALL');
              }}
              options={STAGE_OPTIONS}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          {/* Grade Level Dropdown */}
          <div>
            <Select
              aria-label="اختيار الصف الدراسي"
              value={selectedGrade}
              onChange={(e) => {
                const g = e.target.value;
                setSelectedGrade(g);
                if (g !== 'ALL') {
                  const stage = getAcademicStage(g);
                  if (stage && selectedStage !== stage) {
                    setSelectedStage(stage);
                  }
                }
              }}
              options={gradeOptionsForStage}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          {/* Content Type Dropdown */}
          <div>
            <Select
              aria-label="اختيار نوع الملف"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={CONTENT_TYPE_OPTIONS}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
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
          <span title={!isOnline ? 'يتطلب رفع المرفقات اتصالاً بالإنترنت' : undefined}>
            <Button onClick={onUploadClick} disabled={!isOnline} className="shadow-md shadow-primary/20">
              <Plus className="w-4 h-4 ml-2" />
              رفع أول مرفق للحصة
            </Button>
          </span>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500 text-sm">لم يتم العثور على ملفات تطابق كلمات البحث أو الفلاتر المحددة</p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-3">
              <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
              إعادة تعيين الفلاتر
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedContents.map((content) => {
              const isVideo =
                content.contentType === ContentType.LECTURE_RECORDING ||
                content.fileKey?.startsWith('bunny:') ||
                content.mimeType?.startsWith('video/') ||
                content.fileUrl?.includes('mediadelivery.net') ||
                content.fileUrl?.includes('bunny');

              return (
                <div
                  key={content.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Header & Icon */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <div
                        onClick={() => isVideo && setPlayingVideo(content)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${
                          isVideo
                            ? 'bg-rose-50 border-rose-100 text-rose-500 cursor-pointer'
                            : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}
                      >
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
                    {isVideo ? (
                      <button
                        onClick={() => setPlayingVideo(content)}
                        className="flex-1 flex items-center justify-center h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl transition-colors text-xs gap-1.5 border border-rose-100 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        تشغيل ومشاهدة الحصة
                      </button>
                    ) : (
                      <a
                        href={content.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center h-9 bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold rounded-xl transition-colors text-xs gap-1.5"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        فتح وتحميل المرفق
                      </a>
                    )}
                    <button
                      onClick={() => setEditingContent(content)}
                      className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-slate-200/80 cursor-pointer"
                      title="تعديل المرفق"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredContents.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="مرفق/ملف"
            />
          )}
        </div>
      )}

      {/* Edit Content Modal */}
      <EditContentModal
        isOpen={!!editingContent}
        content={editingContent}
        onClose={() => setEditingContent(null)}
      />

      {/* Video Player Modal for Bunny Stream Playback */}
      <VideoPlayerModal
        isOpen={!!playingVideo}
        content={playingVideo}
        onClose={() => setPlayingVideo(null)}
      />

      <ConfirmModal
        isOpen={!!contentToDelete}
        onClose={() => setContentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الملف"
        message={`هل أنت متأكد من حذف الملف "${contentToDelete?.title}" نهائياً من المكتبة التعليمية؟`}
        confirmText="حذف الملف"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
