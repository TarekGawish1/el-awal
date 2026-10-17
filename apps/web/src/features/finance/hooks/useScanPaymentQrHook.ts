import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scanPaymentQr } from '../api/finance.api';
import { ScanPaymentQrPayload, ScanPaymentQrResponse } from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { formatBookletMismatchError } from '../utils/bookletEligibility';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { financeKeys } from './financeKeys';

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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline-pay-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
