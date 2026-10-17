import { PaymentQuery } from '../types/finance.types';

export const financeKeys = {
  all: ['finance'] as const,
  payments: () => [...financeKeys.all, 'payments'] as const,
  paymentList: (query: PaymentQuery) => [...financeKeys.payments(), query] as const,
  studentHistory: (studentId: string) => [...financeKeys.all, 'student-history', studentId] as const,
  defaulters: (groupId: string, year: number, month: number) =>
    [...financeKeys.all, 'defaulters', groupId, year, month] as const,
  matrixLedger: (query: Record<string, unknown>) => [...financeKeys.all, 'matrix-ledger', query] as const,
  billingConfiguration: (academicYear: string, academicTerm: string) =>
    [...financeKeys.all, 'billing-configuration', academicYear, academicTerm] as const,
  financeAnalytics: (query: Record<string, unknown>) => [...financeKeys.all, 'finance-analytics', query] as const,
  dashboardAnalytics: (query: Record<string, unknown>) => [...financeKeys.all, 'dashboard-analytics', query] as const,
  init: (query: Record<string, unknown>) => [...financeKeys.all, 'init', query] as const,
};
