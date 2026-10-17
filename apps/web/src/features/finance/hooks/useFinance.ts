// Modular re-exports preserving 100% backwards compatibility
export { financeKeys } from './financeKeys';

export {
  useFinanceInit,
  useFinanceDashboardAnalytics,
  useMatrixLedger,
  useFinanceAnalytics,
  useBillingConfiguration,
  useUpdateBillingConfiguration,
} from './useFinanceAnalyticsHooks';

export {
  usePayments,
  useStudentPaymentHistory,
  useGroupDefaulters,
} from './useFinanceQueries';

export { useScanPaymentQr } from './useScanPaymentQrHook';

export {
  useRecordPayment,
  useDeletePayment,
  useRefundPayment,
  type DeletePaymentResult,
} from './usePaymentRecordMutations';
