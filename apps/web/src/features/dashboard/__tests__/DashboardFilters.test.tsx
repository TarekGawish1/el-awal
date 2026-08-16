import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DashboardFilters } from '../components/DashboardFilters';
import { DashboardFilterState } from '../types/dashboard.types';

const defaultFilters: DashboardFilterState = {
  academicYear: '2026-2027',
  groupId: 'ALL',
  dateRange: 'week',
};

const mockGroups = [
  { id: 'g1', name: 'مجموعة 1', gradeLevel: '3 ثانوي' },
  { id: 'g2', name: 'مجموعة 2', gradeLevel: '2 ثانوي' },
];

describe('DashboardFilters Component', () => {
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
});
