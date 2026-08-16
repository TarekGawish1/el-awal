/**
 * Teacher Dashboard Feature Public Interface
 */

export { TeacherDashboardContainer } from './components/TeacherDashboardContainer';
export { DashboardHeader } from './components/DashboardHeader';
export { DashboardFilters } from './components/DashboardFilters';
export { DashboardKpiGrid } from './components/DashboardKpiGrid';
export { TodaySessionsSection } from './components/TodaySessionsSection';
export { AttendanceTrendSection } from './components/AttendanceTrendSection';
export { AttentionSection } from './components/AttentionSection';
export { GroupPerformanceSection } from './components/GroupPerformanceSection';
export { DashboardOfflineBanner } from './components/DashboardOfflineBanner';
export { DashboardErrorState } from './components/DashboardErrorState';
export { DashboardEmptyState } from './components/DashboardEmptyState';

export { useTeacherDashboard, useTeacherGroups } from './hooks/useTeacherDashboard';
export { fetchTeacherGroups, fetchTeacherDashboardOverview } from './api/dashboard.api';
export * from './types/dashboard.types';
