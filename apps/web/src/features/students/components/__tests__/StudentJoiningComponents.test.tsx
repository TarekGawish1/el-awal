import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StudentJoiningBadge } from '../common/StudentJoiningBadge';
import { StudentJoiningCell } from '../table/StudentJoiningCell';
import { StudentListViewSwitcher } from '../StudentListViewSwitcher';
import { JoiningStatsKpiCards } from '../timeline/JoiningStatsKpiCards';
import { JoiningTimelineFilters } from '../timeline/JoiningTimelineFilters';
import { StudentJoiningHistorySection } from '../student-details/StudentJoiningHistorySection';

describe('StudentJoining Modular Components', () => {
  describe('StudentJoiningBadge', () => {
    it('renders group link badge when createdByName indicates group link', () => {
      render(<StudentJoiningBadge createdByName="رابط انضمام: مجموعة النخبة" showDetails />);
      expect(screen.getByText('رابط (مجموعة النخبة)')).toBeInTheDocument();
    });

    it('renders manual registration badge when createdByName is manual or teacher', () => {
      render(<StudentJoiningBadge createdByName="المعلم أ. أحمد" showDetails />);
      expect(screen.getByText('المعلم أ. أحمد')).toBeInTheDocument();
    });

    it('renders direct platform registration badge when createdByName is null', () => {
      render(<StudentJoiningBadge createdByName={null} showDetails />);
      expect(screen.getByText('تسجيل مباشر عبر المنصة')).toBeInTheDocument();
    });
  });

  describe('StudentJoiningCell', () => {
    it('renders formatted date and badge in table cell', () => {
      render(
        <table>
          <tbody>
            <tr>
              <td>
                <StudentJoiningCell
                  createdAt="2026-10-25T10:30:00Z"
                  createdByName="رابط انضمام: مجموعة النخبة"
                />
              </td>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByText(/أكتوبر/)).toBeInTheDocument();
      expect(screen.getByText(/رابط المجموعة/)).toBeInTheDocument();
    });
  });

  describe('StudentListViewSwitcher', () => {
    it('renders tab options and calls onTabChange', () => {
      const handleTabChange = vi.fn();
      render(
        <StudentListViewSwitcher
          activeTab="LIST"
          onTabChange={handleTabChange}
          totalStudents={42}
        />
      );

      expect(screen.getByText('جدول وسجل الطلاب')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('سجل وتاريخ الانضمام')).toBeInTheDocument();

      fireEvent.click(screen.getByText('سجل وتاريخ الانضمام'));
      expect(handleTabChange).toHaveBeenCalledWith('HISTORY');
    });
  });

  describe('JoiningStatsKpiCards', () => {
    it('displays aggregate counts and relative date', () => {
      render(
        <JoiningStatsKpiCards
          stats={{
            total: 25,
            groupLinkCount: 15,
            manualCount: 10,
            latestDate: 'منذ ساعتين',
          }}
        />
      );

      expect(screen.getByText('25 طالب')).toBeInTheDocument();
      expect(screen.getByText('15 طالب')).toBeInTheDocument();
      expect(screen.getByText('10 طالب')).toBeInTheDocument();
      expect(screen.getByText(/منذ ساعتين/)).toBeInTheDocument();
    });
  });

  describe('JoiningTimelineFilters', () => {
    it('calls onSearchChange and onMethodFilterChange', () => {
      const handleSearch = vi.fn();
      const handleFilter = vi.fn();

      render(
        <JoiningTimelineFilters
          search=""
          onSearchChange={handleSearch}
          methodFilter="ALL"
          onMethodFilterChange={handleFilter}
          totalCount={30}
          groupLinkCount={18}
          manualCount={12}
        />
      );

      const input = screen.getByPlaceholderText(/بحث في سجل الانضمام/);
      fireEvent.change(input, { target: { value: 'محمد' } });
      expect(handleSearch).toHaveBeenCalledWith('محمد');

      fireEvent.click(screen.getByText(/رابط المجموعة \(18\)/));
      expect(handleFilter).toHaveBeenCalledWith('GROUP_LINK');
    });
  });

  describe('StudentJoiningHistorySection', () => {
    it('renders joining date, method and group enrollment', () => {
      render(
        <StudentJoiningHistorySection
          student={{
            createdAt: '2026-10-25T10:30:00Z',
            createdByName: 'رابط انضمام: مجموعة النخبة',
          }}
          enrollments={[
            {
              id: 'en-1',
              status: 'ACTIVE',
              enrolledAt: '2026-10-25T10:30:00Z',
              group: {
                name: 'مجموعة النخبة',
              },
            },
          ]}
        />
      );

      expect(screen.getByText('سجل وتاريخ الانضمام إلى المنصة')).toBeInTheDocument();
      expect(screen.getByText(/انضمام عبر رابط المجموعة/)).toBeInTheDocument();
      expect(screen.getByText('مجموعة النخبة')).toBeInTheDocument();
    });
  });
});
