'use client';

import React, { useState } from 'react';
import { StudentList } from '@/features/students/components/StudentList';
import { CreateStudentForm } from '@/features/students/components/CreateStudentForm';
import { Button } from '@/components/ui/Button';

export default function TeacherStudentsPage() {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your students and their records
          </p>
        </div>
        {!isCreating && (
          <Button className="mt-4 sm:mt-0" onClick={() => setIsCreating(true)}>
            Add Student
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Register New Student</h2>
          <CreateStudentForm
            onSuccess={() => setIsCreating(false)}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : (
        <StudentList />
      )}
    </div>
  );
}
