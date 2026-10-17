import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recordPayment,
  deletePayment,
  refundPayment,
} from '../api/finance.api';
import {
  RecordPaymentPayload,
  StudentPaymentRecord,
} from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { financeKeys } from './financeKeys';

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: RecordPaymentPayload
    ): Promise<
      | StudentPaymentRecord
      | {
          success: boolean;
          isDuplicate?: boolean;
          isOfflineSaved: boolean;
          message: string;
          payment?: any;
        }
    > => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const isBooklet = payload.paymentType === 'BOOKLET' || Boolean(payload.bookletId);
        if (isBooklet && payload.bookletId) {
          const booklet = await offlineDb.getBookletByIdOffline(payload.bookletId);
          const bookletCheck = await offlineDb.isBookletPaymentRecordedOffline(
            payload.studentId,
            payload.bookletId
          );

          if (bookletCheck.isRecorded) {
            return {
              success: false,
              isDuplicate: true,
              isOfflineSaved: true,
              message: `تم سداد قيمة المذكرة (${booklet?.title || ''}) لهذا الطالب مسبقاً`,
              payment: bookletCheck.existingPayment,
            };
          }

          const parsedAmountPaid =
            payload.amountPaid !== undefined && payload.amountPaid !== null
              ? Number(payload.amountPaid)
              : undefined;

          const resolvedExpectedBookletAmount =
            booklet && Number(booklet.price) > 0 ? Number(booklet.price) : 50;

          const resolvedBookletAmount =
            parsedAmountPaid !== undefined && !isNaN(parsedAmountPaid)
              ? parsedAmountPaid
              : resolvedExpectedBookletAmount;

          const paymentRecord = await offlineDb.recordBookletPaymentOffline({
            studentId: payload.studentId,
            bookletId: payload.bookletId,
            amountPaid: resolvedBookletAmount,
            amountExpected: resolvedExpectedBookletAmount,
            groupId: payload.groupId,
            notes: payload.notes,
            receiptNumber: payload.receiptNumber,
            paymentMethod: payload.paymentMethod,
          });

          return {
            success: true,
            isDuplicate: false,
            isOfflineSaved: true,
            message: `تم تسجيل سداد المذكرة (${booklet?.title || ''}) محلياً بنجاح 💾`,
            payment: paymentRecord,
          };
        }

        const periodYear = Number(payload.periodYear || new Date().getFullYear());
        const periodMonth = Number(payload.periodMonth || (new Date().getMonth() + 1));

        const check = await offlineDb.isPaymentRecordedOffline(
          payload.studentId,
          payload.groupId,
          periodYear,
          periodMonth
        );

        if (check.isRecorded) {
          return {
            success: false,
            isDuplicate: true,
            isOfflineSaved: true,
            message: `تم تسجيل سداد شهر ${periodMonth} - ${periodYear} لهذا الطالب مسبقاً`,
            payment: check.existingPayment,
          };
        }

        const group = payload.groupId
          ? await offlineDb.getGroupByIdOffline(payload.groupId)
          : payload.studentId
          ? await offlineDb
              .getStudentByIdOffline(payload.studentId)
              .then((s) => (s?.groupId ? offlineDb.getGroupByIdOffline(s.groupId) : null))
          : null;

        const groupFee = Number(
          group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0
        );

        const parsedAmountPaid =
          payload.amountPaid !== undefined && payload.amountPaid !== null
            ? Number(payload.amountPaid)
            : undefined;
        const resolvedExpected = groupFee > 0 ? groupFee : 350;

        const resolvedAmountPaid =
          parsedAmountPaid !== undefined && !isNaN(parsedAmountPaid)
            ? parsedAmountPaid
            : resolvedExpected;

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId: payload.studentId,
          groupId: payload.groupId || group?.id || null,
          periodYear,
          periodMonth,
          amountExpected: resolvedExpected,
          amountPaid: resolvedAmountPaid,
          currency: 'EGP',
          paymentStatus:
            resolvedAmountPaid >= resolvedExpected && resolvedExpected > 0 ? 'PAID' : 'PENDING',
          paymentMethod: payload.paymentMethod || 'CASH',
          receiptNumber: payload.receiptNumber || null,
          recordedById: 'offline-teacher',
          notes: payload.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await offlineDb.bulkPutPayments([paymentRecord]);
        await offlineDb.markStudentPaidOffline(payload.studentId, paymentRecord);

        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SUBSCRIPTIONS.RECORD_PAYMENT,
          'POST',
          {
            ...payload,
            type: 'CREATE_PAYMENT',
            amount: resolvedAmountPaid,
            amountPaid: resolvedAmountPaid,
            amountExpected: resolvedExpected,
            paymentType: 'TUITION',
            paymentMethod: payload.paymentMethod || 'CASH',
            clientTimestamp: Date.now(),
          }
        );

        return {
          success: true,
          isDuplicate: false,
          isOfflineSaved: true,
          message: 'تم تسجيل دفعة الاشتراك محلياً بنجاح ووضعها في انتظار المزامنة 💾',
          payment: paymentRecord,
        };
      }

      return recordPayment(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      if (variables.groupId) {
        queryClient.invalidateQueries({
          queryKey: financeKeys.defaulters(
            variables.groupId,
            variables.periodYear,
            variables.periodMonth
          ),
        });
      }
      queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(variables.studentId) });
    },
  });
}

export interface DeletePaymentResult {
  success: boolean;
  isOfflineSaved: boolean;
  mode: 'ONLINE' | 'LOCAL_DISCARD' | 'QUEUED_DELETE';
  message: string;
  payment?: any;
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeletePaymentResult> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const currentUserId = useAuthStore.getState().user?.id;
        if (!currentUserId) throw new Error('Authentication required');
        const pendingMutations = await offlineDb.getPendingMutations(currentUserId);
        const pendingCreation = pendingMutations.find(
          (m) =>
            m.domain === 'finance' &&
            m.payload?.type !== 'DELETE_PAYMENT' &&
            (m.optimisticId === id || m.payload?.id === id)
        );

        if (pendingCreation) {
          await offlineDb.deletePaymentLocally(id);
          await offlineDb.removeMutation(pendingCreation.id);

          return {
            success: true,
            isOfflineSaved: true,
            mode: 'LOCAL_DISCARD',
            message: 'تم إلغاء العملية المحلية وإزالتها من قائمة الانتظار فوراً 🗑️',
          };
        }

        const removedPayment = await offlineDb.deletePaymentLocally(id);

        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SYNC.PAYMENTS,
          'DELETE',
          {
            type: 'DELETE_PAYMENT',
            paymentId: id,
            clientTimestamp: Date.now(),
            previousPaymentSnapshot: removedPayment || null,
          }
        );

        return {
          success: true,
          isOfflineSaved: true,
          mode: 'QUEUED_DELETE',
          message: 'تم حذف الدفعة محلياً ووضع العملية في انتظار المزامنة مع السيرفر 💾',
          payment: removedPayment,
        };
      }

      await deletePayment(id);
      return {
        success: true,
        isOfflineSaved: false,
        mode: 'ONLINE',
        message: 'تم حذف الدفعة بنجاح',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-ledger'] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const removed = await offlineDb.deletePaymentLocally(id);
        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SUBSCRIPTIONS.REFUND_PAYMENT(id),
          'POST',
          {
            type: 'REFUND_PAYMENT',
            paymentId: id,
            reason,
            clientTimestamp: Date.now(),
          }
        );
        return {
          success: true,
          message: 'تم تسجيل استرداد المبلغ محلياً وجدولة المزامنة 💾',
          payment: removed,
        };
      }

      return refundPayment(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-ledger'] });
    },
  });
}
