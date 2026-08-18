'use client';

import { useState } from 'react';
import {
  FileText,
  FileDown,
  Plus,
  Trash2,
  BookOpen,
  Layers,
  Sparkles,
  Search,
  File,
  Video,
  AlertCircle,
} from 'lucide-react';
import { useContent, useDeleteContent } from '@/features/content/hooks/use-content';
import { ContentType, EducationalContent } from '@/features/content/types/content.types';
import { UploadModal } from '@/features/content/components/UploadModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';

interface GroupSessionAttachmentsProps {
  groupId: string;
  gradeLevel: string;
  groupName: string;
}

export function GroupSessionAttachments({
  groupId,
  gradeLevel,
  groupName,
}: GroupSessionAttachmentsProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: contents = [], isLoading, isError, error, refetch } = useContent({
    groupId,
    includeGradeScope: 'true',
  });

  const { mutate: deleteContent, isPending: isDeleting } = useDeleteContent();

  const filteredContents = contents.filter((content) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      content.title.toLowerCase().includes(q) ||
      (content.sessionTopic && content.sessionTopic.toLowerCase().includes(q)) ||
      (content.description && content.description.toLowerCase().includes(q))
    );
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف المرفق "${title}"؟`)) {
      deleteContent(id, {
        onSuccess: () => toast.success('تم حذف المرفق بنجاح'),
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الحذف'),
      });
    }
  };

  const getIcon = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE:
        return <File className="w-5 h-5 text-blue-500" />;
      case ContentType.SUMMARY:
        return <FileText className="w-5 h-5 text-emerald-500" />;
      case ContentType.REFERENCE:
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      case ContentType.LECTURE_RECORDING:
        return <Video className="w-5 h-5 text-rose-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500" />;
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
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            placeholder="بحث في مرفقات الحصص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-sm"
          />
        </div>

        <Button
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          className="shadow-sm shadow-primary/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة مرفق للحصة
        </Button>
      </div>

      {/* Info notice about grade scope */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-800">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">مرفقات متاحة تلقائياً:</span> المرفقات المرفوعة لصف ({gradeLevel}) تظهر تلقائياً
          لهذه المجموعة داخل الحصة المعنية، بالإضافة للمرفقات المخصصة لهذه المجموعة مباشرة.
        </div>
      </div>

      {/* Attachments List */}
      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4 ml-2" />
          <span>{(error as any)?.message || 'فشل في تحميل مرفقات المجموعة'}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-auto text-xs">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-700 text-sm mb-1">لا توجد مرفقات أو مذكرات بعد</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            قم برفع ملف أو مذكرة لحصة معينة وستظهر لجميع طلاب هذه المجموعة تلقائياً.
          </p>
          <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="w-4 h-4 ml-1.5" />
            رفع أول مرفق
          </Button>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500">لا توجد نتائج تطابق بحثك</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredContents.map((content) => (
            <div
              key={content.id}
              className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getIcon(content.contentType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm truncate" title={content.title}>
                      {content.title}
                    </h4>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {getTypeLabel(content.contentType)}
                    </span>
                    {content.sessionTopic && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        {content.sessionTopic}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{formatFileSize(content.fileSize)}</span>
                    <span>•</span>
                    {content.groupId ? (
                      <span className="text-emerald-700 font-medium">مخصص لهذه المجموعة</span>
                    ) : (
                      <span className="text-indigo-700 font-medium flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        مشترك لجميع مجموعات {gradeLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <a
                  href={content.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  تحميل
                </a>
                <button
                  onClick={() => handleDelete(content.id, content.title)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        initialGroupId={groupId}
        initialGradeLevel={gradeLevel}
      />
    </div>
  );
}
