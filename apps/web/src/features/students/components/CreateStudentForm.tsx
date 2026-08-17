'use client';

import React, { useState } from 'react';
import { useCreateStudent } from '../hooks/use-students';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface CreateStudentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateStudentForm({ onSuccess, onCancel }: CreateStudentFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    password: '',
    educationalStage: '',
    gradeLevel: '',
    initialGroupId: '',
  });

  const generatePassword = (phone: string, stage: string, grade: string) => {
    if (!stage && !grade && !phone) return '';
    const stageCode = stage === 'PRIMARY' ? 'P' : stage === 'MIDDLE' ? 'M' : stage === 'SECONDARY' ? 'S' : '';
    let gradeNum = '';
    if (grade) {
      if (grade.includes('الأول')) gradeNum = '1';
      else if (grade.includes('الثاني')) gradeNum = '2';
      else if (grade.includes('الثالث')) gradeNum = '3';
      else if (grade.includes('الرابع')) gradeNum = '4';
      else if (grade.includes('الخامس')) gradeNum = '5';
      else if (grade.includes('السادس')) gradeNum = '6';
    }
    
    const prefix = `${stageCode}${gradeNum}`;
    const phonePart = phone ? phone.replace(/\D/g, '').slice(-4) : '1234'; // Default to 1234 if no phone
    
    if (!prefix) return phonePart;
    return `${prefix}${phonePart}`;
  };

  const stages = [
    { label: '-- اختر المرحلة الدراسية --', value: '' },
    { label: 'المرحلة الابتدائية', value: 'PRIMARY' },
    { label: 'المرحلة الإعدادية', value: 'MIDDLE' },
    { label: 'المرحلة الثانوية', value: 'SECONDARY' },
  ];

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
  const [errorMsg, setErrorMsg] = useState('');

  const { mutate, isPending } = useCreateStudent();
  const { data: groups } = useGroups();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'educationalStage') {
        updated.gradeLevel = ''; // Reset grade when stage changes
        updated.initialGroupId = ''; // Reset group
      }
      if (name === 'gradeLevel') {
        updated.initialGroupId = ''; // Reset group when grade changes
      }

      if (['phone', 'educationalStage', 'gradeLevel'].includes(name)) {
        updated.password = generatePassword(updated.phone, updated.educationalStage, updated.gradeLevel);
      }

      return updated;
    });
  };

  const filteredGroups = formData.gradeLevel
    ? groups?.filter((g) => g.gradeLevel === formData.gradeLevel) || []
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    mutate(
      {
        fullName: formData.fullName,
        password: formData.password,
        gradeLevel: formData.gradeLevel,
        phone: formData.phone || undefined,
        parentPhone: formData.parentPhone || undefined,
        initialGroupId: formData.initialGroupId || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || 'Failed to create student.';
          setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      <Input
        label="الاسم الرباعي"
        name="fullName"
        required
        value={formData.fullName}
        onChange={handleChange}
        placeholder="مثال: محمود أحمد"
        minLength={3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="رقم هاتف الطالب (اختياري)"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+201012345678"
          className="text-left"
        />
        <Input
          label="رقم هاتف ولي الأمر *"
          name="parentPhone"
          value={formData.parentPhone}
          onChange={handleChange}
          placeholder="+201012345678"
          className="text-left"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Input
          label="كلمة المرور"
          name="password"
          type="text"
          required
          readOnly
          value={formData.password}
          onChange={handleChange}
          minLength={6}
          className="text-left font-mono tracking-wider font-bold text-primary-700 bg-slate-50 cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">المرحلة الدراسية <span className="text-red-500 ms-1">*</span></label>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { id: 'PRIMARY', label: 'الابتدائية', icon: '✏️' },
            { id: 'MIDDLE', label: 'الإعدادية', icon: '🏫' },
            { id: 'SECONDARY', label: 'الثانوية', icon: '🎓' },
          ].map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  educationalStage: stage.id,
                  gradeLevel: '', // Reset grade when stage changes
                }));
              }}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 ${
                formData.educationalStage === stage.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-4 ring-primary-50'
                  : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-100 text-slate-500'
              }`}
            >
              <span className="text-2xl sm:text-3xl mb-1 sm:mb-2">{stage.icon}</span>
              <span className="font-bold text-xs sm:text-sm">{stage.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Select
          label="الصف الدراسي"
          name="gradeLevel"
          required
          disabled={!formData.educationalStage}
          value={formData.gradeLevel}
          onChange={handleChange}
          options={[
            { label: '-- اختر الصف الدراسي --', value: '' },
            ...(formData.educationalStage ? gradeOptions[formData.educationalStage] : []),
          ]}
        />
        <Select
          label="المجموعة الحالية (اختياري)"
          name="initialGroupId"
          value={formData.initialGroupId}
          onChange={handleChange}
          disabled={!formData.gradeLevel}
          options={[
            { label: '-- اختر المجموعة --', value: '' },
            ...(filteredGroups.map((g) => ({
              label: g.name, // Only show name since grade is already selected
              value: g.id,
            }))),
          ]}
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" className="rounded-xl px-6" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" className="rounded-xl px-6 shadow-md shadow-primary-500/20" disabled={isPending}>
          {isPending ? 'جاري التسجيل...' : 'تسجيل الطالب'}
        </Button>
      </div>
    </form>
  );
}
