'use client';

import React, { useState, useMemo } from 'react';
import { useUpdateStudent } from '../hooks/use-students';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { StudentDetail } from '../types/students.types';

interface StudentEditFormProps {
  student: StudentDetail;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudentEditForm({ student, onSuccess, onCancel }: StudentEditFormProps) {
  const parentLink = student.parentLinks?.[0]?.parent;
  const initialGroupId = student.groupEnrollments?.[0]?.group?.id || '';

  const [formData, setFormData] = useState({
    fullName: student.user?.fullName || '',
    phone: student.user?.phone || '',
    educationalStage: student.academicStage || '',
    gradeLevel: student.gradeLevel || '',
    initialGroupId: initialGroupId,
    parentName: parentLink?.user?.fullName || '',
    parentPhone: parentLink?.user?.phone || student.emergencyPhone || '',
  });

  const [initialData] = useState(formData);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const { mutate, isPending } = useUpdateStudent();
  const { data: groups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const gradeOptions: Record<string, { label: string; value: string }[]> = {
    PRIMARY: [
      { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
      { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
      { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
      { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
      { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
      { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
    ],
    MIDDLE: [
      { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
      { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
      { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
    ],
    SECONDARY: [
      { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
      { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
      { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
    ],
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'educationalStage') {
        updated.gradeLevel = '';
        updated.initialGroupId = '';
      }
      if (name === 'gradeLevel') {
        updated.initialGroupId = '';
      }
      return updated;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!formData.gradeLevel || !groups) return [];
    return groups.filter((g) => {
      const matchGrade = g.gradeLevel === formData.gradeLevel;
      const matchYear = !activeYear || !g.academicYear || g.academicYear === activeYear;
      const matchTerm = !activeTerm || !g.academicTerm || g.academicTerm === activeTerm;
      return matchGrade && matchYear && matchTerm;
    });
  }, [formData.gradeLevel, groups, activeYear, activeTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      onSuccess();
      return;
    }
    setErrorMsg('');

    mutate(
      {
        id: student.id,
        payload: {
          fullName: formData.fullName,
          gradeLevel: formData.gradeLevel,
          academicStage: formData.educationalStage || undefined,
          phone: formData.phone || undefined,
          parentName: formData.parentName || undefined,
          parentPhone: formData.parentPhone || undefined,
          initialGroupId: formData.initialGroupId || undefined,
        },
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err: any) => {
          let msg = err.message || err.response?.data?.message || 'حدث خطأ أثناء التعديل';
          msg = Array.isArray(msg) ? msg[0] : msg;
          setErrorMsg(msg);
        },
      }
    );
  };

  const handleCancelClick = () => {
    if (hasChanges) {
      setShowConfirmCancel(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

          {/* Section 1: Basic Data */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">البيانات الأساسية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="الاسم الرباعي"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                dir="rtl"
              />
              <Input
                label="رقم هاتف الطالب"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          {/* Section 2: Academic Data */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">البيانات الأكاديمية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="المرحلة الدراسية"
                name="educationalStage"
                required
                value={formData.educationalStage}
                onChange={handleChange}
                options={[
                  { label: '-- اختر المرحلة --', value: '' },
                  { label: 'المرحلة الابتدائية', value: 'PRIMARY' },
                  { label: 'المرحلة الإعدادية', value: 'MIDDLE' },
                  { label: 'المرحلة الثانوية', value: 'SECONDARY' },
                ]}
              />
              <Select
                label="الصف الدراسي"
                name="gradeLevel"
                required
                disabled={!formData.educationalStage}
                value={formData.gradeLevel}
                onChange={handleChange}
                options={[
                  { label: '-- اختر الصف --', value: '' },
                  ...(formData.educationalStage ? gradeOptions[formData.educationalStage] : []),
                ]}
              />
              <div className="sm:col-span-2">
                <Select
                  label="المجموعة الدراسية (اختياري)"
                  name="initialGroupId"
                  value={formData.initialGroupId}
                  onChange={handleChange}
                  disabled={!formData.gradeLevel}
                  options={[
                    { label: '-- اختر المجموعة --', value: '' },
                    ...filteredGroups.map((g) => ({
                      label: g.name,
                      value: g.id,
                    })),
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parent Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">ولي الأمر</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="اسم ولي الأمر"
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                dir="rtl"
              />
              <Input
                label="رقم هاتف ولي الأمر"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="flex justify-end gap-3 pt-4 pb-2 border-t border-slate-100 mt-2 px-2">
        <Button type="button" variant="outline" className="rounded-xl px-6" onClick={handleCancelClick}>
          إلغاء
        </Button>
        <Button 
          type="submit" 
          form="edit-student-form"
          className="rounded-xl px-6" 
          disabled={isPending || !hasChanges}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </Button>
      </div>

      {showConfirmCancel && (
        <ConfirmModal
          isOpen={showConfirmCancel}
          title="لديك تعديلات لم يتم حفظها"
          message="هل أنت متأكد من رغبتك في إلغاء التعديلات؟"
          confirmLabel="متابعة التعديل"
          cancelLabel="إلغاء التعديلات"
          onConfirm={() => setShowConfirmCancel(false)}
          onClose={() => {
            setShowConfirmCancel(false);
            onCancel();
          }}
          variant="warning"
        />
      )}
    </div>
  );
}
