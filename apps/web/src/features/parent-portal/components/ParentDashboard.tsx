'use client';

import { AlertCircle, BookOpen, GraduationCap, RefreshCw, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useLinkedStudents } from '../hooks/useParentPortal';

export function ParentDashboard() {
  const { user } = useAuth();
  const { data: linkedStudents, isLoading, isError, refetch } = useLinkedStudents();

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
      <div>
        <p className="text-sm font-semibold text-primary-600">بوابة ولي الأمر</p>
        <h1 className="mt-1 text-2xl font-extrabold text-neutral-900">مرحبًا {user?.fullName || 'بك'}</h1>
        <p className="mt-2 text-sm text-neutral-500">تابع بيانات أبنائك ومستواهم الدراسي من مكان واحد.</p>
      </div>

      {!linkedStudents?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="h-8 w-8 text-neutral-400" />
            <h2 className="font-bold text-neutral-900">لا يوجد أبناء مرتبطون بهذا الحساب</h2>
            <p className="text-sm text-neutral-500">يرجى مراجعة الإدارة للتأكد من ربط الطالب بولي الأمر.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {linkedStudents.map(({ linkId, relationshipType, student }) => (
            <Card key={linkId} className="border-neutral-200/90 shadow-sm">
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
    </div>
  );
}
