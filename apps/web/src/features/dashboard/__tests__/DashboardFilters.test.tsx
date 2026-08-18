import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DashboardFilters } from '../components/DashboardFilters';
import { DashboardFilterState } from '../types/dashboard.types';

const defaultFilters: DashboardFilterState = {
  academicYear: '2026-2027',
  academicTerm: 'ALL',
  groupId: 'ALL',
  dateRange: 'week',
};

const mockGroups = [
  { id: 'g1', name: 'مجموعة 1', gradeLevel: '3 ثانوي', academicYear: '2026-2027', academicTerm: 'FIRST_TERM' },
  { id: 'g2', name: 'مجموعة 2', gradeLevel: '2 ثانوي', academicYear: '2026-2027', academicTerm: 'SECOND_TERM' },
];

describe('DashboardFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders filter controls and triggers onFilterChange when preset clicked', () => {
    const handleFilterChange = vi.fn();
    const handleResetFilters = vi.fn();

    render(
      <DashboardFilters
        filters={defaultFilters}
        groups={mockGroups}
        isGroupsLoading={false}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isFiltered={false}
      />
    );

    expect(screen.getByText('تصفية المؤشرات:')).toBeInTheDocument();
    expect(screen.getByText('اليوم')).toBeInTheDocument();
    expect(screen.getByText('هذا الأسبوع')).toBeInTheDocument();
    expect(screen.getByText('هذا الشهر')).toBeInTheDocument();

    fireEvent.click(screen.getByText('هذا الشهر'));
    expect(handleFilterChange).toHaveBeenCalledWith({ dateRange: 'month' });
  });

  it('renders reset button when isFiltered is true and calls onResetFilters', () => {
    const handleResetFilters = vi.fn();

    render(
      <DashboardFilters
        filters={{ ...defaultFilters, groupId: 'g1' }}
        groups={mockGroups}
        isGroupsLoading={false}
        onFilterChange={vi.fn()}
        onResetFilters={handleResetFilters}
        isFiltered={true}
      />
    );

    const resetBtn = screen.getByText('إعادة تعيين');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(handleResetFilters).toHaveBeenCalledTimes(1);
  });

  it('triggers onFilterChange when semester / academic term changed', () => {
    const handleFilterChange = vi.fn();

    render(
      <DashboardFilters
        filters={defaultFilters}
        groups={mockGroups}
        isGroupsLoading={false}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
        isFiltered={false}
      />
    );

    const termSelect = screen.getByLabelText('اختيار الفصل الدراسي');
    fireEvent.change(termSelect, { target: { value: 'FIRST_TERM' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ academicTerm: 'FIRST_TERM' });
  });

  it('opens add year modal and saves new academic year', () => {
    const handleFilterChange = vi.fn();

    render(
      <DashboardFilters
        filters={defaultFilters}
        groups={mockGroups}
        isGroupsLoading={false}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
        isFiltered={false}
      />
    );

    const yearSelect = screen.getByLabelText('اختيار العام الدراسي');
    fireEvent.change(yearSelect, { target: { value: '__ADD_NEW__' } });

    expect(screen.getByText('إضافة عام دراسي جديد')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('مثال: 2027-2028 أو 2028-2029');
    fireEvent.change(input, { target: { value: '2028-2029' } });

    const submitBtn = screen.getByText('إضافة وتحديد');
    fireEvent.click(submitBtn);

    expect(handleFilterChange).toHaveBeenCalledWith({ academicYear: '2028-2029' });
    expect(JSON.parse(localStorage.getItem('el_awal_saved_academic_years') || '[]')).toContain('2028-2029');
  });
});
