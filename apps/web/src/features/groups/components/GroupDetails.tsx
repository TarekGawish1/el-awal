'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, UserPlus, FileText, AlertCircle, CalendarDays, Settings, Trash2, Loader2 } from 'lucide-react';
import { useGroup, useDeleteGroup } from '../hooks/useGroups';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { StudentList } from './StudentList';
import { AddStudentModal } from './AddStudentModal';
import { DeleteGroupModal } from './DeleteGroupModal';
import { EditGroupModal } from './EditGroupModal';

interface GroupDetailsProps {
  id: string;
}

export function GroupDetails({ id }: GroupDetailsProps) {
  const router = useRouter();
  const { data: group, isLoading, isError, error, refetch } = useGroup(id);
  const deleteGroup = useDeleteGroup();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteGroup.mutateAsync(id);
      router.push('/teacher/groups');
    } catch (err) {
      alert('حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى.');
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <Link href="/teacher/groups" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للمجموعات
        </Link>
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل تفاصيل المجموعة</p>
            <p className="text-sm opacity-90">{(error as any)?.message || 'تأكد من صحة الرابط أو حاول مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
            إعادة المحاولة
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 mb-8">
          <Skeleton className="w-24 h-6" />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/4 mb-6" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/teacher/groups" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للمجموعات
        </Link>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-slate-600 bg-white shadow-sm"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Settings className="w-4 h-4 ml-2" />
            تعديل المجموعة
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200 bg-white shadow-sm"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="w-4 h-4 ml-2" />
            حذف المجموعة
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
              <Badge variant={group.status === 'ACTIVE' ? 'success' : 'default'}>
                {group.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
            <p className="text-slate-500">{group.gradeLevel}</p>
            
            {group.description && (
              <p className="text-slate-600 mt-4 max-w-3xl">{group.description}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-100">
                <Users className="w-4 h-4 ml-2 text-slate-400" />
                <span className="font-semibold ml-1">{group._count?.enrollments || 0}</span> / {group.maxCapacity || 'غير محدود'} طالب
              </div>
              <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-100">
                <CalendarDays className="w-4 h-4 ml-2 text-slate-400" />
                <span className="font-semibold ml-1">{group._count?.schedules || 0}</span> مواعيد
              </div>
              {group.monthlyFee !== undefined && group.monthlyFee > 0 && (
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-100">
                  <span className="font-semibold ml-1">{group.monthlyFee}</span> ج.م شهرياً
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsAddStudentModalOpen(true)}>
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة طالب
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 ml-2" />
              كشف الحضور
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Users className="w-5 h-5 ml-2 text-slate-400" />
            قائمة الطلاب
          </h2>
        </div>
        <div className="p-6">
          <StudentList groupId={id} />
        </div>
      </div>

      <AddStudentModal 
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        groupId={id}
      />

      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteGroup.isPending}
        groupName={group.name}
      />

      <EditGroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        group={group}
      />
    </div>
  );
}
