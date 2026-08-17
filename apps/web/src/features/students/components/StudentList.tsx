'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStudents } from '../hooks/use-students';
import { AcademicStatus } from '../types/students.types';

export function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCursor(undefined); // Reset pagination on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError } = useStudents({
    search: debouncedSearch || undefined,
    cursor,
    limit: 10,
  });

  const getStatusColor = (status: AcademicStatus) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'GRADUATED': return 'info';
      case 'DROPPED_OUT': return 'warning';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  const handleNextPage = () => {
    if (data?.meta.hasMore && data?.meta.nextCursor) {
      setCursor(data.meta.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (data?.meta.prevCursor) {
      setCursor(data.meta.prevCursor);
    } else {
      setCursor(undefined); // Going back to first page
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="w-full sm:w-1/3">
          <Input
            type="search"
            placeholder="Search by name, phone or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Student Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Code</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Group</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                      Failed to load students.
                    </td>
                  </tr>
                ) : !data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {debouncedSearch ? 'No students match your search.' : 'No students found.'}
                    </td>
                  </tr>
                ) : (
                  data.data.map((student) => (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/teacher/students/${student.id}`} className="text-primary-600 hover:underline">
                          {student.user.fullName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{student.studentCode}</td>
                      <td className="px-6 py-4">
                        {student.groupEnrollments[0]?.group.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusColor(student.academicStatus)}>
                          {student.academicStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/teacher/students/${student.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {data && (
            <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevPage} 
                disabled={!cursor} // Cannot go back if no cursor is set (meaning we are on first page)
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage} 
                disabled={!data.meta.hasMore}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
