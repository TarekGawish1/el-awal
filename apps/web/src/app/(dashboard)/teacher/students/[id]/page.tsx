'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStudent } from '@/features/students/hooks/use-students';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StudentQrBadge } from '@/features/students/components/StudentQrBadge';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const { data: student, isLoading, isError } = useStudent(studentId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          Failed to load student details or student not found.
        </div>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          &larr; Back
        </Button>
        <h1 className="text-2xl font-bold">{student.user.fullName}</h1>
        <Badge variant={student.academicStatus === 'ACTIVE' ? 'success' : 'default'}>
          {student.academicStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Student Code</dt>
                  <dd className="mt-1 text-sm font-mono">{student.studentCode}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Grade Level</dt>
                  <dd className="mt-1 text-sm">{student.gradeLevel}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="mt-1 text-sm" dir="ltr">{student.user.phone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Emergency Phone</dt>
                  <dd className="mt-1 text-sm" dir="ltr">{student.emergencyPhone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="mt-1 text-sm">{student.user.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Date</dt>
                  <dd className="mt-1 text-sm">{new Date(student.createdAt).toLocaleDateString('ar-EG')}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {student.groupEnrollments.length === 0 ? (
                <p className="text-sm text-gray-500">Not enrolled in any active groups.</p>
              ) : (
                <ul className="divide-y dark:divide-gray-700">
                  {student.groupEnrollments.map((enrollment) => (
                    <li key={enrollment.group.id} className="py-3 flex justify-between items-center">
                      <span className="font-medium">{enrollment.group.name}</span>
                      <span className="text-sm text-gray-500">{enrollment.group.gradeLevel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parent / Guardian Links</CardTitle>
            </CardHeader>
            <CardContent>
              {student.parentLinks.length === 0 ? (
                <p className="text-sm text-gray-500">No parent accounts linked.</p>
              ) : (
                <ul className="divide-y dark:divide-gray-700">
                  {student.parentLinks.map((link) => (
                    <li key={link.parent.user.id} className="py-3">
                      <p className="font-medium">{link.parent.user.fullName}</p>
                      <p className="text-sm text-gray-500" dir="ltr">{link.parent.user.phone}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <StudentQrBadge studentId={studentId} />
        </div>
      </div>
    </div>
  );
}
