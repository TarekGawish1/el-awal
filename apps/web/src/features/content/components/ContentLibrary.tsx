'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useContent, useDeleteContent } from '../hooks/use-content';
import { EducationalContent } from '../types/content.types';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { EditContentModal } from './EditContentModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';
import { ContentCard } from './content-library/ContentCard';
import { ContentLibraryToolbar } from './content-library/ContentLibraryToolbar';

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
      <ContentLibraryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        academicYearOptions={academicYearOptions}
        selectedTerm={selectedTerm}
        onTermChange={setSelectedTerm}
        selectedStage={selectedStage}
        onStageChange={(stage) => {
          setSelectedStage(stage);
          setSelectedGrade('ALL');
        }}
        selectedGrade={selectedGrade}
        onGradeChange={(grade) => {
          setSelectedGrade(grade);
          if (grade !== 'ALL') {
            const stage = getAcademicStage(grade);
            if (stage && selectedStage !== stage) {
              setSelectedStage(stage);
            }
          }
        }}
        gradeOptionsForStage={gradeOptionsForStage}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        isFiltered={isFiltered}
        onResetFilters={handleResetFilters}
      />

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
            {paginatedContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onPlayVideo={setPlayingVideo}
                onEdit={setEditingContent}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            ))}
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
