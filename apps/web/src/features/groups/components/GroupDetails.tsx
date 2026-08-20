'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, UserPlus, FileText, AlertCircle, CalendarDays, Settings, Trash2, Loader2, MapPin } from 'lucide-react';
import { useGroup, useDeleteGroup } from '../hooks/useGroups';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { StudentList } from './StudentList';
import { GroupSessionAttachments } from './GroupSessionAttachments';
import { AddStudentModal } from './AddStudentModal';
import { DeleteGroupModal } from './DeleteGroupModal';
import { EditGroupModal } from './EditGroupModal';
import toast from 'react-hot-toast';

interface GroupDetailsProps {
  id: string;
}

export function GroupDetails({ id }: GroupDetailsProps) {
  const router = useRouter();
  const { data: group, isLoading, isError, error, refetch } = useGroup(id);
  const deleteGroup = useDeleteGroup();
  const [activeTab, setActiveTab] = useState<'students' | 'attachments'>('students');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteGroup.mutateAsync(id);
      toast.success('تم حذف المجموعة بنجاح');
      router.push('/teacher/groups');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى.');
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
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-slate-600 font-medium">{group.gradeLevel}</span>
              {group.academicYear && (
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  العام الدراسي {group.academicYear}
                </span>
              )}
              {group.academicTerm && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {group.academicTerm === 'SECOND_TERM' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
                </span>
              )}
            </div>
            
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
                <span className="font-semibold ml-1">{group._count?.schedules || group.schedules?.length || 0}</span> مواعيد
              </div>
              {group.monthlyFee !== undefined && group.monthlyFee > 0 && (
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-100">
                  <span className="font-semibold ml-1">{group.monthlyFee}</span> ج.م شهرياً
                </div>
              )}
            </div>

            {/* Detailed Schedules & Locations */}
            {group.schedules && group.schedules.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2">مواعيد وأماكن الحصص:</p>
                <div className="flex flex-wrap gap-2">
                  {group.schedules.map((schedule: any, idx: number) => {
                    const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                    const dayName = daysMap[schedule.dayOfWeek] || 'اليوم';
                    return (
                      <div key={idx} className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-center gap-2">
                        <span className="font-bold text-primary-700">{dayName}</span>
                        <span className="text-slate-400">|</span>
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                        {schedule.location && (
                          <>
                            <span className="text-slate-400">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <MapPin className="w-3 h-3 text-primary-600" />
                              {schedule.location}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsAddStudentModalOpen(true)}>
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة طالب
            </Button>
            <Button variant="outline" onClick={() => router.push('/teacher/attendance')}>
              <FileText className="w-4 h-4 ml-2" />
              كشف الحضور
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Students vs Session Attachments */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 bg-slate-50/70 flex gap-4">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'students'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            قائمة الطلاب ({group._count?.enrollments || 0})
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'attachments'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            مرفقات وملازم الحصص
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'students' ? (
            <StudentList groupId={id} />
          ) : (
            <GroupSessionAttachments
              groupId={id}
              gradeLevel={group.gradeLevel}
              groupName={group.name}
            />
          )}
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
