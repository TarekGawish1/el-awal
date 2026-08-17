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
    email: '',
    password: '',
    gradeLevel: '',
    initialGroupId: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const { mutate, isPending } = useCreateStudent();
  const { data: groups } = useGroups();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    mutate(
      {
        fullName: formData.fullName,
        password: formData.password,
        gradeLevel: formData.gradeLevel,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      <Input
        label="Full Name *"
        name="fullName"
        required
        value={formData.fullName}
        onChange={handleChange}
        placeholder="e.g. Mahmoud Ahmed"
        minLength={3}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone (Optional)"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+201012345678"
        />
        <Input
          label="Email (Optional)"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="student@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Password *"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          minLength={6}
        />
        <Input
          label="Grade Level *"
          name="gradeLevel"
          required
          value={formData.gradeLevel}
          onChange={handleChange}
          placeholder="e.g. الصف الثالث الثانوي"
        />
      </div>

      <Select
        label="Initial Group (Optional)"
        name="initialGroupId"
        value={formData.initialGroupId}
        onChange={handleChange}
        options={[
          { label: '-- Select Group --', value: '' },
          ...(groups?.map((g) => ({
            label: `${g.name} (${g.gradeLevel})`,
            value: g.id,
          })) || []),
        ]}
      />

      <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Register Student'}
        </Button>
      </div>
    </form>
  );
}
