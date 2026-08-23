import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchStudentPaymentHistory,
  fetchGroupDefaulters,
  recordPayment,
  scanPaymentQr,
  deletePayment,
} from '../api/finance.api';
import { PaymentQuery, RecordPaymentPayload, ScanPaymentQrPayload, DefaultersResponse, ScanPaymentQrResponse, StudentPaymentRecord } from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { formatBookletMismatchError } from '../utils/bookletEligibility';
import { parseStudentQr } from '@/lib/qr/qr-parser';

export const financeKeys = {
  all: ['finance'] as const,
  payments: () => [...financeKeys.all, 'payments'] as const,
  paymentList: (query: PaymentQuery) => [...financeKeys.payments(), query] as const,
  studentHistory: (studentId: string) => [...financeKeys.all, 'student-history', studentId] as const,
  defaulters: (groupId: string, year: number, month: number) => 
    [...financeKeys.all, 'defaulters', groupId, year, month] as const,
};

export function usePayments(query: PaymentQuery) {
  return useInfiniteQuery({
    queryKey: financeKeys.paymentList(query),
    queryFn: async ({ pageParam }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineList = await offlineDb.getPaymentsOffline({
          groupId: query.groupId,
          studentId: query.studentId,
          year: query.periodYear ? Number(query.periodYear) : undefined,
          month: query.periodMonth ? Number(query.periodMonth) : undefined,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            nextCursor: undefined,
            hasMore: false,
          },
        };
      }

      try {
        const result = await fetchPayments({ ...query, cursor: pageParam });
        if (result?.data && result.data.length > 0) {
          offlineDb.bulkPutPayments(result.data as any);
        }
        return result;
      } catch (err) {
        const offlineList = await offlineDb.getPaymentsOffline({
          groupId: query.groupId,
          studentId: query.studentId,
          year: query.periodYear ? Number(query.periodYear) : undefined,
          month: query.periodMonth ? Number(query.periodMonth) : undefined,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            nextCursor: undefined,
            hasMore: false,
          },
        };
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage?.meta?.nextCursor,
  });
}

export function useStudentPaymentHistory(studentId: string) {
  return useQuery<StudentPaymentRecord[]>({
    queryKey: financeKeys.studentHistory(studentId),
    queryFn: async (): Promise<StudentPaymentRecord[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const payments = await offlineDb.getPaymentsOffline({ studentId });
        return payments as unknown as StudentPaymentRecord[];
      }
      try {
        return await fetchStudentPaymentHistory(studentId);
      } catch {
        const payments = await offlineDb.getPaymentsOffline({ studentId });
        return payments as unknown as StudentPaymentRecord[];
      }
    },
    enabled: !!studentId,
  });
}

export function useGroupDefaulters(groupId: string, year: number, month: number) {
  return useQuery<DefaultersResponse>({
    queryKey: financeKeys.defaulters(groupId, year, month),
    queryFn: async (): Promise<DefaultersResponse> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const group = await offlineDb.getGroupByIdOffline(groupId);
        return {
          groupId,
          groupName: group?.name || 'المجموعة الدراسية',
          periodYear: year,
          periodMonth: month,
          totalEnrolled: group?._count?.enrollments || 0,
          totalDefaulters: 0,
          defaulters: [],
        };
      }
      try {
        return await fetchGroupDefaulters(groupId, year, month);
      } catch {
        const group = await offlineDb.getGroupByIdOffline(groupId);
        return {
          groupId,
          groupName: group?.name || 'المجموعة الدراسية',
          periodYear: year,
          periodMonth: month,
          totalEnrolled: group?._count?.enrollments || 0,
          totalDefaulters: 0,
          defaulters: [],
        };
      }
    },
    enabled: !!groupId && !!year && !!month,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload): Promise<StudentPaymentRecord | { success: boolean; isDuplicate?: boolean; isOfflineSaved: boolean; message: string; payment?: any }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const isBooklet = payload.paymentType === 'BOOKLET' || Boolean(payload.bookletId);
        if (isBooklet && payload.bookletId) {
          const booklet = await offlineDb.getBookletByIdOffline(payload.bookletId);
          const bookletCheck = await offlineDb.isBookletPaymentRecordedOffline(payload.studentId, payload.bookletId);

          if (bookletCheck.isRecorded) {
            return {
              success: false,
              isDuplicate: true,
              isOfflineSaved: true,
              message: `تم سداد قيمة المذكرة (${booklet?.title || ''}) لهذا الطالب مسبقاً`,
              payment: bookletCheck.existingPayment,
            };
          }

          const resolvedBookletAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : booklet && Number(booklet.price) > 0
              ? Number(booklet.price)
              : 50;

          const paymentRecord = await offlineDb.recordBookletPaymentOffline({
            studentId: payload.studentId,
            bookletId: payload.bookletId,
            amountPaid: resolvedBookletAmount,
            amountExpected: resolvedBookletAmount,
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
          periodMonth,
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
          ? await offlineDb.getStudentByIdOffline(payload.studentId).then((s) => (s?.groupId ? offlineDb.getGroupByIdOffline(s.groupId) : null))
          : null;

        const groupFee = Number(group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0);
        const resolvedAmount =
          payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
            ? Number(payload.amountPaid)
            : groupFee > 0
            ? groupFee
            : 350;

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId: payload.studentId,
          groupId: payload.groupId || group?.id || null,
          periodYear,
          periodMonth,
          amountExpected: resolvedAmount,
          amountPaid: resolvedAmount,
          currency: 'EGP',
          paymentStatus: 'PAID' as any,
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
            amount: resolvedAmount,
            amountPaid: resolvedAmount,
            amountExpected: resolvedAmount,
            paymentType: 'TUITION',
            paymentMethod: payload.paymentMethod || 'CASH',
            clientTimestamp: Date.now(),
          },
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
          queryKey: financeKeys.defaulters(variables.groupId, variables.periodYear, variables.periodMonth) 
        });
      }
      queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(variables.studentId) });
    },
  });
}

export function useScanPaymentQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ScanPaymentQrPayload): Promise<ScanPaymentQrResponse & { isOfflineSaved?: boolean }> => {
      // 1. Strict QR Format & Prefix Verification
      const parsed = parseStudentQr(payload.qrCodeToken);
      if (!parsed.isValid) {
        const err: any = new Error(parsed.errorMessage || 'الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.');
        err.code = parsed.error || 'INVALID_QR_CODE';
        throw err;
      }

      const effectiveToken = parsed.token || payload.qrCodeToken;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // 2. Strict Offline Database Lookup Verification
        const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
        if (!localMatch || !localMatch.student) {
          const err: any = new Error('بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.');
          err.code = 'STUDENT_NOT_FOUND';
          throw err;
        }

        const student = localMatch.student;
        const studentId = student.id;
        const resolvedStudentName = student.fullName || student.user?.fullName || 'طالب';
        const groupId = payload.groupId || localMatch.groupId || student.groupId;
        const periodYear = Number(payload.periodYear || new Date().getFullYear());
        const periodMonth = Number(payload.periodMonth || (new Date().getMonth() + 1));
        const isBooklet = payload.paymentType === 'BOOKLET' || Boolean(payload.bookletId);

        if (isBooklet && payload.bookletId) {
          const booklet = await offlineDb.getBookletByIdOffline(payload.bookletId);
          const bookletCheck = await offlineDb.isBookletPaymentRecordedOffline(studentId, payload.bookletId);

          if (bookletCheck.isRecorded) {
            return {
              success: false,
              isDuplicate: true,
              isOfflineSaved: true,
              message: `تم سداد قيمة المذكرة (${booklet?.title || ''}) لهذا الطالب مسبقاً`,
              payment: bookletCheck.existingPayment,
              student: {
                id: studentId,
                fullName: resolvedStudentName,
                phone: student.phone || student.user?.phone || null,
              },
              booklet: booklet ? {
                id: booklet.id,
                title: booklet.title,
                price: Number(booklet.price),
              } : undefined,
              group: groupId ? {
                id: groupId,
                name: localMatch.groupName || 'المجموعة',
              } : null,
            };
          }

          const resolvedBookletAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : booklet && Number(booklet.price) > 0
              ? Number(booklet.price)
              : 50;

          const paymentRecord = await offlineDb.recordBookletPaymentOffline({
            studentId,
            bookletId: payload.bookletId,
            amountPaid: resolvedBookletAmount,
            amountExpected: resolvedBookletAmount,
            groupId,
          });

          return {
            success: true,
            isDuplicate: false,
            isOfflineSaved: true,
            message: `تم تسجيل سداد المذكرة (${booklet?.title || ''}) محلياً بنجاح 💾`,
            payment: paymentRecord as any,
            booklet: booklet ? {
              id: booklet.id,
              title: booklet.title,
              price: Number(booklet.price),
            } : undefined,
            student: {
              id: studentId,
              fullName: resolvedStudentName,
              phone: student.phone || student.user?.phone || null,
            },
            group: groupId ? {
              id: groupId,
              name: localMatch.groupName || 'المجموعة',
            } : null,
          };
        }

        const paymentCheck = await offlineDb.isPaymentRecordedOffline(
          studentId,
          groupId,
          periodYear,
          periodMonth,
        );

        if (paymentCheck.isRecorded) {
          return {
            success: false,
            isDuplicate: true,
            isOfflineSaved: true,
            message: `تم سداد اشتراك شهر ${periodMonth} - ${periodYear} للطالب مسبقاً`,
            payment: paymentCheck.existingPayment,
            student: {
              id: studentId,
              fullName: resolvedStudentName,
              phone: student.phone || student.user?.phone || null,
            },
            group: groupId ? {
              id: groupId,
              name: localMatch.groupName || 'المجموعة',
            } : null,
          };
        }

        // Resolve group monthly fee from IndexedDB/memory
        const group = groupId
          ? await offlineDb.getGroupByIdOffline(groupId)
          : student.groupId
          ? await offlineDb.getGroupByIdOffline(student.groupId)
          : null;

        const groupFee = Number(group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0);
        const resolvedAmount =
          payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
            ? Number(payload.amountPaid)
            : groupFee > 0
            ? groupFee
            : 350;

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId,
          groupId: groupId || group?.id || null,
          periodYear,
          periodMonth,
          amountExpected: resolvedAmount,
          amountPaid: resolvedAmount,
          currency: 'EGP',
          paymentStatus: 'PAID' as any,
          paymentMethod: payload.paymentMethod || 'CASH',
          receiptNumber: payload.receiptNumber || null,
          recordedById: 'offline-teacher',
          notes: payload.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await offlineDb.bulkPutPayments([paymentRecord]);
        await offlineDb.markStudentPaidOffline(studentId, paymentRecord);

        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SUBSCRIPTIONS.SCAN_QR,
          'POST',
          {
            ...payload,
            type: 'CREATE_PAYMENT',
            qrCodeToken: effectiveToken,
            studentId,
            groupId: groupId || group?.id || null,
            amount: resolvedAmount,
            amountPaid: resolvedAmount,
            amountExpected: resolvedAmount,
            periodYear,
            periodMonth,
            paymentType: 'TUITION',
            paymentMethod: payload.paymentMethod || 'CASH',
            clientTimestamp: Date.now(),
          },
        );

        return {
          success: true,
          isDuplicate: false,
          isOfflineSaved: true,
          message: 'تم تسجيل سداد الاشتراك محلياً بنجاح وسيتم إرساله عند الاتصال 💾',
          payment: paymentRecord,
          student: {
            id: studentId,
            fullName: resolvedStudentName,
            phone: student.phone || student.user?.phone || null,
          },
          group: groupId ? {
            id: groupId,
            name: localMatch.groupName || group?.name || 'المجموعة',
          } : null,
        };
      }

      try {
        return await scanPaymentQr({ ...payload, qrCodeToken: effectiveToken });
      } catch (error: any) {
        const bookletMismatchMessage = formatBookletMismatchError(
          error?.response?.data?.message || error?.message,
        );
        if (bookletMismatchMessage) {
          throw new Error(bookletMismatchMessage);
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
          if (!localMatch || !localMatch.student) {
            const err: any = new Error('بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.');
            err.code = 'STUDENT_NOT_FOUND';
            throw err;
          }

          const student = localMatch.student;
          const studentId = student.id;
          const groupId = payload.groupId || localMatch.groupId || student.groupId;
          const periodYear = Number(payload.periodYear || new Date().getFullYear());
          const periodMonth = Number(payload.periodMonth || (new Date().getMonth() + 1));
          const resolvedStudentName = student.fullName || student.user?.fullName || 'طالب';

          const paymentCheck = await offlineDb.isPaymentRecordedOffline(
            studentId,
            groupId,
            periodYear,
            periodMonth,
          );

          if (paymentCheck.isRecorded) {
            return {
              success: false,
              isDuplicate: true,
              isOfflineSaved: true,
              message: `تم سداد اشتراك شهر ${periodMonth} - ${periodYear} للطالب مسبقاً`,
              payment: paymentCheck.existingPayment,
              student: { id: studentId, fullName: resolvedStudentName, phone: student.phone || student.user?.phone || null },
              group: groupId ? { id: groupId, name: localMatch.groupName || 'المجموعة' } : null,
            };
          }

          const group = groupId
            ? await offlineDb.getGroupByIdOffline(groupId)
            : student.groupId
            ? await offlineDb.getGroupByIdOffline(student.groupId)
            : null;

          const groupFee = Number(group?.monthlyFee ?? (group as any)?.fee ?? (group as any)?.price ?? 0);
          const resolvedAmount =
            payload.amountPaid !== undefined && Number(payload.amountPaid) > 0
              ? Number(payload.amountPaid)
              : groupFee > 0
              ? groupFee
              : 350;

          const paymentRecord: any = {
            id: `offline-pay-${Date.now()}`,
            studentId,
            groupId: groupId || group?.id || null,
            periodYear,
            periodMonth,
            amountExpected: resolvedAmount,
            amountPaid: resolvedAmount,
            currency: 'EGP',
            paymentStatus: 'PAID' as any,
            paymentMethod: payload.paymentMethod || 'CASH',
            receiptNumber: payload.receiptNumber || null,
            recordedById: 'offline-teacher',
            notes: payload.notes || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await offlineDb.bulkPutPayments([paymentRecord]);
          await offlineDb.markStudentPaidOffline(studentId, paymentRecord);

          await syncEngine.enqueue(
            'finance',
            API_ENDPOINTS.SUBSCRIPTIONS.SCAN_QR,
            'POST',
            {
              ...payload,
              type: 'CREATE_PAYMENT',
              qrCodeToken: effectiveToken,
              studentId,
              groupId: groupId || group?.id || null,
              amount: resolvedAmount,
              amountPaid: resolvedAmount,
              amountExpected: resolvedAmount,
              periodYear,
              periodMonth,
              paymentType: 'TUITION',
              paymentMethod: payload.paymentMethod || 'CASH',
              clientTimestamp: Date.now(),
            },
          );

          return {
            success: true,
            isDuplicate: false,
            isOfflineSaved: true,
            message: 'تم حفظ السداد محلياً بنجاح في انتظار الاتصال 💾',
            payment: paymentRecord,
            student: { id: studentId, fullName: resolvedStudentName, phone: student.phone || student.user?.phone || null },
            group: groupId ? { id: groupId, name: localMatch.groupName || group?.name || 'المجموعة' } : null,
          };
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.payments() });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
      if (data?.student?.id) {
        queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(data.student.id) });
      }
      const targetGroupId = variables.groupId || data?.group?.id;
      if (targetGroupId) {
        const year = variables.periodYear || new Date().getFullYear();
        const month = variables.periodMonth || (new Date().getMonth() + 1);
        queryClient.invalidateQueries({ 
          queryKey: financeKeys.defaulters(targetGroupId, year, month) 
        });
      }
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

/**
 * Deletes/reverses a recorded payment (tuition or booklet), fully supporting offline mode:
 *  - Case A: The payment was itself created offline and is still an unsynced outbox mutation.
 *    It is discarded directly (both the local record and its pending mutation are removed),
 *    instantly reverting the student's paid status and local revenue metrics.
 *  - Case B: The payment already exists on the server. It is removed optimistically from
 *    local IndexedDB and a `DELETE_PAYMENT` mutation is enqueued for the backend to execute
 *    `prisma.studentPaymentRecord.delete(...)` once synced.
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeletePaymentResult> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const pendingMutations = await offlineDb.getPendingMutations();
        const pendingCreation = pendingMutations.find(
          (m) =>
            m.domain === 'finance' &&
            m.payload?.type !== 'DELETE_PAYMENT' &&
            (m.optimisticId === id || m.payload?.id === id),
        );

        if (pendingCreation) {
          // Case A: purge the local-only payment and its unsent creation mutation together.
          await offlineDb.deletePaymentLocally(id);
          await offlineDb.removeMutation(pendingCreation.id);

          return {
            success: true,
            isOfflineSaved: true,
            mode: 'LOCAL_DISCARD',
            message: 'تم إلغاء العملية المحلية وإزالتها من قائمة الانتظار فوراً 🗑️',
          };
        }

        // Case B: optimistically remove a previously-synced payment and queue its deletion.
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
          },
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
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['group-defaulters'] });
    },
  });
}
