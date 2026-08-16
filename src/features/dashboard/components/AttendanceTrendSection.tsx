import React, { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPercentage } from '@/lib/utils/formatters';
import { AttendanceTrendPoint } from '@/types/dashboard.types';

export interface AttendanceTrendSectionProps {
  trends?: AttendanceTrendPoint[];
  isLoading?: boolean;
}

export function AttendanceTrendSection({ trends = [], isLoading = false }: AttendanceTrendSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-5">
          <Skeleton className="h-44 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Calculate stats for chart scaling
  const validTrends = trends.length > 0 ? trends : [];
  const rates = validTrends.map((t) => t.rate);
  const minRate = rates.length > 0 ? Math.max(0, Math.min(...rates) - 10) : 0;
  const maxRate = 100;
  const chartHeight = 150;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const points = validTrends.map((t, idx) => {
    const totalCount = validTrends.length;
    const x = totalCount > 1
      ? paddingX + (idx / (totalCount - 1)) * (chartWidth - paddingX * 2)
      : chartWidth / 2;
    const normalizedY = (t.rate - minRate) / (maxRate - minRate);
    const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
    return { ...t, x, y };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Average trend
  const averageRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success-50 text-success-600 rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>مسار نسبة الحضور عبر الفترات</CardTitle>
              <span className="text-xs text-neutral-500">
                معدل الحضور التراكمي: {formatPercentage(averageRate)}
              </span>
            </div>
          </div>

          <Badge variant="success" size="sm">
            مؤشر مستقر
          </Badge>
        </CardHeader>

        <CardContent className="p-4">
          {validTrends.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              لا توجد بيانات حضور كافية لرسم المنحنى الزمني للفترة المحددة
            </div>
          ) : (
            <div className="relative">
              {/* Screen reader table for accessibility */}
              <table className="sr-only">
                <caption>بيانات معدلات الحضور عبر الفترات</caption>
                <thead>
                  <tr>
                    <th scope="col">الفترة</th>
                    <th scope="col">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {validTrends.map((item, i) => (
                    <tr key={i}>
                      <td>{item.period}</td>
                      <td>{formatPercentage(item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Accessible SVG Line Chart */}
              <div className="w-full overflow-hidden" aria-hidden="true">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 overflow-visible"
                >
                  {/* Grid Lines */}
                  {[100, 75, 50].map((level) => {
                    const normalizedY = (level - minRate) / (maxRate - minRate);
                    const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
                    return (
                      <g key={level} className="text-neutral-300">
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 3}
                          fontSize="10"
                          fill="#94A3B8"
                          textAnchor="end"
                        >
                          {level}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area under curve */}
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E4BD9" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#1E4BD9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {points.length > 1 && (
                    <path
                      d={`${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`}
                      fill="url(#attendanceGradient)"
                    />
                  )}

                  {/* Trend Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#1E4BD9"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points and Interactivity */}
                  {points.map((pt, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          fill="#FFFFFF"
                          stroke="#1E4BD9"
                          strokeWidth={isHovered ? 3 : 2}
                          className="transition-all duration-150"
                        />
                        <text
                          x={pt.x}
                          y={chartHeight - 4}
                          fontSize="10"
                          fill="#64748B"
                          textAnchor="middle"
                          fontWeight="500"
                        >
                          {pt.period}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Hover / Focus Tooltip */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <div
                  className="absolute top-0 bg-neutral-900 text-white text-[11px] px-2.5 py-1.5 rounded shadow-lg pointer-events-none transform -translate-x-1/2 flex items-center gap-2"
                  style={{
                    left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                  }}
                >
                  <span className="font-semibold">{points[hoveredIndex].period}:</span>
                  <span className="text-success-400 font-bold">
                    {formatPercentage(points[hoveredIndex].rate)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>

      <div className="px-4 py-2.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 rounded-b-lg">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-neutral-400" />
          مقارنة نسب الحضور أسبوعياً
        </span>
        <span className="font-medium text-neutral-700">المستهدف: 90% فأعلى</span>
      </div>
    </Card>
  );
}
