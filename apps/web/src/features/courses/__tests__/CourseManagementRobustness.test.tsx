import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useCourseManagement } from '../hooks/useCourseManagement';
import { CourseManagementContainer } from '../components/CourseManagementContainer';
import * as useCoursesHooks from '../hooks/useCourses';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/realtime/socket', () => ({
  getRealtimeSocket: vi.fn(() => ({ connected: false })),
}));

vi.mock('@/lib/realtime/useRealtimeCourseSubscriptions', () => ({
  useRealtimeCourseSubscriptions: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('CourseManagement Robustness & Defensive Array Handling', () => {
  it('does not throw "e.filter is not a function" when useTeacherCourses returns null', () => {
    vi.spyOn(useCoursesHooks, 'useTeacherCourses').mockReturnValue({
      data: null as any,
      isLoading: false,
    } as any);

    vi.spyOn(useCoursesHooks, 'useTeacherSubscriptions').mockReturnValue({
      data: null as any,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useCourseManagement(), {
      wrapper: createWrapper(),
    });

    expect(result.current.courses).toEqual([]);
    expect(result.current.filteredCourses).toEqual([]);
    expect(result.current.totalCourses).toBe(0);
    expect(result.current.publishedCourses).toBe(0);
  });

  it('does not throw "e.filter is not a function" when useTeacherCourses returns an empty object {}', () => {
    vi.spyOn(useCoursesHooks, 'useTeacherCourses').mockReturnValue({
      data: {} as any,
      isLoading: false,
    } as any);

    vi.spyOn(useCoursesHooks, 'useTeacherSubscriptions').mockReturnValue({
      data: {} as any,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useCourseManagement(), {
      wrapper: createWrapper(),
    });

    expect(result.current.courses).toEqual([]);
    expect(result.current.filteredCourses).toEqual([]);
    expect(result.current.totalCourses).toBe(0);
  });

  it('correctly unwraps wrapped response { courses: [...] }', () => {
    const mockCourse = {
      id: 'c-1',
      title: 'رياضيات ثانوية عامة',
      subject: 'رياضيات',
      gradeLevel: 'GRADE_12',
      status: 'PUBLISHED',
      totalLessons: 10,
      _count: { enrollments: 25 },
    };

    vi.spyOn(useCoursesHooks, 'useTeacherCourses').mockReturnValue({
      data: { courses: [mockCourse] } as any,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useCourseManagement(), {
      wrapper: createWrapper(),
    });

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.filteredCourses).toHaveLength(1);
    expect(result.current.totalCourses).toBe(1);
    expect(result.current.publishedCourses).toBe(1);
    expect(result.current.totalLessons).toBe(10);
    expect(result.current.totalEnrollments).toBe(25);
  });

  it('renders CourseManagementContainer successfully without crash when data is null', () => {
    vi.spyOn(useCoursesHooks, 'useTeacherCourses').mockReturnValue({
      data: null as any,
      isLoading: false,
    } as any);

    vi.spyOn(useCoursesHooks, 'useTeacherSubscriptions').mockReturnValue({
      data: null as any,
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CourseManagementContainer />
      </QueryClientProvider>
    );

    expect(screen.getByText('الكورسات والدورات التدريبية أونلاين')).toBeInTheDocument();
    expect(screen.getByText('لا توجد كورسات مطابقة للبحث')).toBeInTheDocument();
  });
});
