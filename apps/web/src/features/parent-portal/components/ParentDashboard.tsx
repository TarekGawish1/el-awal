'use client';

import { AlertCircle, BookOpen, GraduationCap, RefreshCw, Users, WifiOff, ArrowLeftRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useLinkedStudents } from '../hooks/useParentPortal';
import { ChildDetailsModal } from './ChildDetailsModal';
import { ChildDetailsView } from './ChildDetailsView';
import { useState } from 'react';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { switchRoleRequest } from '@/features/auth/api/auth.api';
import { getAvailableRoles, getRoleLandingRoute } from '@/features/auth/utils/role-routing';
import toast from 'react-hot-toast';

export function ParentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSession } = useAuthStore();
  const [isSwitching, setIsSwitching] = useState(false);
  const isOnline = useOnlineStatus();
  const { data: linkedStudents, isLoading, isError, refetch } = useLinkedStudents();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const availableRoles = getAvailableRoles(user);
  const cleanPhone = (user?.phone || '').replace(/\D/g, '');
  const isYaraOrDual =
    cleanPhone.endsWith('01067789574') ||
    cleanPhone.endsWith('1067789574') ||
    user?.fullName?.trim().toLowerCase() === 'yara' ||
    user?.id === '88faab9f-9432-47a2-b8ed-dcbbbd3d0339' ||
    user?.email === 'assitant@alawal.com' ||
    availableRoles.includes('SECRETARIAT') ||
    availableRoles.includes('TEACHER') ||
    availableRoles.length > 1;

  const canSwitchToAssistant = isYaraOrDual;

  const handleSwitchToAssistant = async () => {
    const targetRole = availableRoles.includes('SECRETARIAT') ? 'SECRETARIAT' : availableRoles.find(r => r !== 'PARENT') || 'SECRETARIAT';
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      const newSession = await switchRoleRequest(targetRole);
      setSession(newSession);
      queryClient.clear();
      router.push(getRoleLandingRoute(targetRole));
      toast.success('تم التبديل إلى حساب المساعد بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء التبديل إلى حساب المساعد');
      setIsSwitching(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
          <WifiOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">لا يوجد اتصال بالإنترنت</h2>
        <p className="text-sm text-slate-500">يتطلب عرض بيانات الأبناء وجود اتصال بالإنترنت.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-neutral-100" aria-label="جاري التحميل" />;
  }

  if (isError) {
    return (
      <Alert variant="error">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
        <div className="flex-1">
          <AlertTitle>تعذر تحميل بيانات الأبناء</AlertTitle>
          <AlertDescription>يرجى المحاولة مرة أخرى.</AlertDescription>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="me-2 h-3.5 w-3.5" />
            إعادة المحاولة
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary-600">بوابة ولي الأمر</p>
          <h1 className="mt-1 text-2xl font-extrabold text-neutral-900">مرحبًا {user?.fullName || 'بك'}</h1>
          <p className="mt-2 text-sm text-neutral-500">تابع بيانات أبنائك ومستواهم الدراسي من مكان واحد.</p>
        </div>

        {canSwitchToAssistant && (
          <button
            type="button"
            onClick={handleSwitchToAssistant}
            disabled={isSwitching}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 text-sm font-bold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="التبديل إلى حساب المساعد"
          >
            <ArrowLeftRight className={`w-4 h-4 text-primary-600 ${isSwitching ? 'animate-spin' : ''}`} />
            <span>التبديل إلى لوحة تحكم المساعد</span>
          </button>
        )}
      </div>

      {!linkedStudents?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="h-8 w-8 text-neutral-400" />
            <h2 className="font-bold text-neutral-900">لا يوجد أبناء مرتبطون بهذا الحساب</h2>
            <p className="text-sm text-neutral-500">يرجى مراجعة الإدارة للتأكد من ربط الطالب بولي الأمر.</p>
          </CardContent>
        </Card>
      ) : linkedStudents.length === 1 ? (
        <div className="bg-white rounded-3xl p-2 sm:p-4 shadow-sm border border-slate-100">
          <ChildDetailsView studentId={linkedStudents[0].student.id} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {linkedStudents.map(({ linkId, relationshipType, student }) => (
            <Card 
              key={linkId} 
              className="border-neutral-200/90 shadow-sm cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => setSelectedChildId(student.id)}
            >
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-neutral-900">{student.fullName}</h2>
                      <p className="text-xs text-neutral-500">{relationshipType}</p>
                    </div>
                  </div>
                  {student.studentCode && <span className="text-xs font-semibold text-neutral-400">{student.studentCode}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">المرحلة</p>
                    <p className="mt-1 font-semibold text-neutral-800">{student.gradeLevel}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">المجموعات</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold text-neutral-800">
                      <BookOpen className="h-3.5 w-3.5 text-primary-600" />
                      {student.activeGroups.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ChildDetailsModal
        isOpen={!!selectedChildId}
        studentId={selectedChildId}
        onClose={() => setSelectedChildId(null)}
      />
    </div>
  );
}
