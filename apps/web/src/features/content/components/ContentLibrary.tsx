'use client';

import { useState } from 'react';
import { Plus, Search, File, FileText, FileDown, Trash2, Video, AlertCircle } from 'lucide-react';
import { useContent, useDeleteContent } from '../hooks/use-content';
import { ContentType, EducationalContent } from '../types/content.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

export function ContentLibrary({ onUploadClick }: { onUploadClick: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'ALL'>('ALL');
  
  const { data: contents = [], isLoading, isError, error, refetch } = useContent(
    filterType !== 'ALL' ? { contentType: filterType } : undefined
  );
  
  const { mutate: deleteContent, isPending: isDeleting } = useDeleteContent();

  const filteredContents = contents.filter(content => 
    content.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      case ContentType.FILE: return <File className="w-8 h-8 text-blue-500" />;
      case ContentType.SUMMARY: return <FileText className="w-8 h-8 text-green-500" />;
      case ContentType.REFERENCE: return <FileText className="w-8 h-8 text-purple-500" />;
      case ContentType.LECTURE_RECORDING: return <Video className="w-8 h-8 text-red-500" />;
      default: return <File className="w-8 h-8 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE: return 'ملف';
      case ContentType.SUMMARY: return 'ملخص';
      case ContentType.REFERENCE: return 'مرجع';
      case ContentType.LECTURE_RECORDING: return 'محاضرة مسجلة';
      default: return 'ملف';
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مكتبة المحتوى التعليمي</h1>
          <p className="text-slate-500 mt-1">إدارة الملفات، الملازم، والفيديوهات التعليمية</p>
        </div>
        <Button onClick={onUploadClick}>
          <Plus className="w-4 h-4 ml-2" />
          رفع ملف جديد
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن ملف..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 flex-shrink-0">
          <select 
            className="w-full h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="ALL">جميع الأنواع</option>
            <option value={ContentType.FILE}>ملفات عامة</option>
            <option value={ContentType.SUMMARY}>ملخصات</option>
            <option value={ContentType.REFERENCE}>مراجع</option>
            <option value={ContentType.LECTURE_RECORDING}>فيديوهات</option>
          </select>
        </div>
      </div>

      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل الملفات</p>
            <p className="text-sm opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 h-40 flex flex-col">
              <Skeleton className="h-12 w-12 mb-4 rounded-lg" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <File className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد ملفات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم برفع أول ملف تعليمي لمشاركته مع طلابك.
          </p>
          <Button onClick={onUploadClick}>
            <Plus className="w-4 h-4 ml-2" />
            رفع ملف
          </Button>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">لم يتم العثور على ملفات تطابق بحثك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContents.map(content => (
            <div key={content.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-slate-50 w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
                  {getIcon(content.contentType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-1" title={content.title}>
                    {content.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" className="bg-slate-100 text-slate-600 font-medium text-xs">
                      {getTypeLabel(content.contentType)}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium flex items-center">
                      {formatFileSize(content.fileSize)}
                    </span>
                  </div>
                </div>
              </div>

              {content.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                  {content.description}
                </p>
              )}

              {/* Assignment context */}
              {(content.group || content.lesson) && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 mb-4 mt-auto border border-slate-100">
                  {content.group && (
                    <div className="font-medium line-clamp-1">مجموعة: {content.group.name}</div>
                  )}
                  {content.lesson && (
                    <div className="font-medium line-clamp-1 mt-1">درس: {content.lesson.title}</div>
                  )}
                </div>
              )}
              {!content.group && !content.lesson && (
                <div className="mt-auto mb-4" />
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <a 
                  href={content.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center h-9 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors text-sm"
                >
                  <FileDown className="w-4 h-4 ml-1.5" />
                  فتح الملف
                </a>
                <button
                  onClick={() => handleDelete(content.id, content.title)}
                  disabled={isDeleting}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
