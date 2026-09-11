import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeoRankingCard } from '../components/GeoRankingCard';
import * as useAnalyticsHook from '../hooks/useAnalytics';

vi.mock('../hooks/useAnalytics', () => ({
  useGeoRanking: vi.fn(),
}));

describe('GeoRankingCard Component', () => {
  it('renders ranking items with percentages and allows toggling to countries', () => {
    vi.mocked(useAnalyticsHook.useGeoRanking).mockReturnValue({
      data: {
        totalVisits: 100,
        groupBy: 'city',
        items: [
          { rank: 1, name: 'القاهرة', visitCount: 60, uniqueVisitors: 45, percentage: 60 },
          { rank: 2, name: 'المنصورة', visitCount: 40, uniqueVisitors: 30, percentage: 40 },
        ],
      },
      isLoading: false,
    } as any);

    render(<GeoRankingCard range="week" scope="all" />);

    expect(screen.getByText('ترتيب الدول والمحافظات الأكثر زيارة')).toBeDefined();
    expect(screen.getByText('القاهرة')).toBeDefined();
    expect(screen.getByText('المنصورة')).toBeDefined();
    expect(screen.getByText('60%')).toBeDefined();
    expect(screen.getByText('40%')).toBeDefined();

    const countryTab = screen.getByText('ترتيب الدول');
    fireEvent.click(countryTab);
  });
});
