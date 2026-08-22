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

          const paymentRecord = await offlineDb.recordBookletPaymentOffline({
            studentId: payload.studentId,
            bookletId: payload.bookletId,
            amountPaid: payload.amountPaid,
            amountExpected: payload.amountPaid,
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

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId: payload.studentId,
          groupId: payload.groupId || null,
          periodYear,
          periodMonth,
          amountExpected: payload.amountPaid,
          amountPaid: payload.amountPaid,
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
          payload,
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
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
        const resolvedStudentName = localMatch?.student?.fullName || 'طالب';
        const studentId = localMatch?.student?.id || payload.qrCodeToken;
        const groupId = payload.groupId || localMatch?.groupId;
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
                phone: localMatch?.student?.phone || null,
              },
              booklet: booklet ? {
                id: booklet.id,
                title: booklet.title,
                price: booklet.price,
              } : undefined,
              group: groupId ? {
                id: groupId,
                name: localMatch?.groupName || 'المجموعة',
              } : null,
            };
          }

          const paymentRecord = await offlineDb.recordBookletPaymentOffline({
            studentId,
            bookletId: payload.bookletId,
            amountPaid: payload.amountPaid !== undefined ? payload.amountPaid : (booklet ? Number(booklet.price) : 0),
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
              price: booklet.price,
            } : undefined,
            student: {
              id: studentId,
              fullName: resolvedStudentName,
              phone: localMatch?.student?.phone || null,
            },
            group: groupId ? {
              id: groupId,
              name: localMatch?.groupName || 'المجموعة',
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
              phone: localMatch?.student?.phone || null,
            },
            group: groupId ? {
              id: groupId,
              name: localMatch?.groupName || 'المجموعة',
            } : null,
          };
        }

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId,
          groupId: groupId || null,
          periodYear,
          periodMonth,
          amountExpected: payload.amountPaid || 350,
          amountPaid: payload.amountPaid || 350,
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
            studentId,
            groupId,
            periodYear,
            periodMonth,
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
            phone: localMatch?.student?.phone || null,
          },
          group: groupId ? {
            id: groupId,
            name: localMatch?.groupName || 'المجموعة',
          } : null,
        };
      }

      try {
        return await scanPaymentQr(payload);
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
          const studentId = localMatch?.student?.id || payload.qrCodeToken;
          const groupId = payload.groupId || localMatch?.groupId;
          const periodYear = Number(payload.periodYear || new Date().getFullYear());
          const periodMonth = Number(payload.periodMonth || (new Date().getMonth() + 1));
          const resolvedStudentName = localMatch?.student?.fullName || 'طالب';

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
              student: { id: studentId, fullName: resolvedStudentName, phone: localMatch?.student?.phone || null },
              group: groupId ? { id: groupId, name: localMatch?.groupName || 'المجموعة' } : null,
            };
          }

          const paymentRecord: any = {
            id: `offline-pay-${Date.now()}`,
            studentId,
            groupId: groupId || null,
            periodYear,
            periodMonth,
            amountExpected: payload.amountPaid || 350,
            amountPaid: payload.amountPaid || 350,
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
            payload,
          );

          return {
            success: true,
            isDuplicate: false,
            isOfflineSaved: true,
            message: 'تم حفظ السداد محلياً بنجاح في انتظار الاتصال 💾',
            payment: paymentRecord,
            student: { id: studentId, fullName: resolvedStudentName, phone: localMatch?.student?.phone || null },
            group: groupId ? { id: groupId, name: localMatch?.groupName || 'المجموعة' } : null,
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

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
