/**
 * Teacher Dashboard Feature Public Interface
 */

export { TeacherDashboardContainer } from './components/TeacherDashboardContainer';
export { DashboardHeader } from './components/DashboardHeader';
export { CurrentNextClass } from './components/CurrentNextClass';
export { TodayScheduleTimeline } from './components/TodayScheduleTimeline';
export { NeedsAttentionUnified } from './components/NeedsAttentionUnified';
export { DashboardOfflineBanner } from './components/DashboardOfflineBanner';
export { DashboardErrorState } from './components/DashboardErrorState';
export { DashboardEmptyState } from './components/DashboardEmptyState';
export { PendingReservationsSection } from './components/PendingReservationsSection'; // Still used by reservations page

export { useTeacherDashboard, useTeacherGroups } from './hooks/useTeacherDashboard';
export { fetchTeacherGroups, fetchTeacherDashboardOverview } from './api/dashboard.api';
export * from './types/dashboard.types';
