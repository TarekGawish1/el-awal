import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  scanQrAttendance,
  recordManualBatch,
} from '../api/attendance.api';
import { BatchAttendanceDto, ScanQrResponse } from '../types/attendance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { parseStudentQr } from '@/lib/qr/qr-parser';

export function useScanQrAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      qrCodeToken,
      allowCrossGroup,
    }: {
      sessionId: string;
      qrCodeToken: string;
      allowCrossGroup?: boolean;
    }): Promise<ScanQrResponse & { isOfflineSaved?: boolean; isUnknown?: boolean }> => {
      const parsed = parseStudentQr(qrCodeToken);
      if (!parsed.isValid) {
        const err: any = new Error(parsed.errorMessage || 'الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.');
        err.code = parsed.error || 'INVALID_QR_CODE';
        throw err;
      }

      const effectiveToken = parsed.token || qrCodeToken;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const reportData: any = queryClient.getQueryData(['sessions', sessionId, 'report']);
        const allSessions = await offlineDb.getSessionsOffline();
        const sessionObj = allSessions.find((s) => s.id === sessionId);
        const sessionGroupId = reportData?.groupId || sessionObj?.groupId || '';
        const sessionGroupObj = sessionGroupId ? await offlineDb.getGroupByIdOffline(sessionGroupId) : null;
        const sessionGroupName = reportData?.groupName || sessionGroupObj?.name || 'المجموعة الحالية';

        const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken, sessionGroupId);
        if (!localMatch || !localMatch.student) {
          const isQueued = await offlineDb.isAttendanceRecordedOffline(sessionId, '', effectiveToken);
          if (isQueued) {
            return {
              isDuplicate: true,
              isCrossGroupPrompt: false,
              message: 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
              student: { id: '', fullName: 'طالب غير متزامن' },
              sessionStats: reportData?.stats,
            };
          }

          await syncEngine.enqueue(
            'attendance',
            API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
            'POST',
            {
              sessionId,
              qrCodeToken: effectiveToken,
              status: 'PRESENT',
              recordingMethod: 'QR_SCAN',
              allowCrossGroup: !!allowCrossGroup,
              isGuest: false,
              notes: 'Pending offline resolution',
            },
          );

          return {
            isDuplicate: false,
            isCrossGroupPrompt: false,
            isCrossGroupSuccess: false,
            isOfflineSaved: true,
            isUnknown: true,
            message: 'تم حفظ الرمز محلياً، وسيتم التحقق منه عند توفر الإنترنت ⏳',
            student: { id: '', fullName: 'طالب غير متزامن' },
          };
        }

        const student = localMatch.student;
        const studentId = student.id;
        const resolvedStudentName = student.fullName || student.user?.fullName || 'طالب';

        const studentGroupId = localMatch.groupId || student.groupId || '';
        const studentGroupObj = studentGroupId ? await offlineDb.getGroupByIdOffline(studentGroupId) : null;
        const studentGroupName = localMatch.groupName || studentGroupObj?.name || 'مجموعة أخرى';

        const studentGroupIds: string[] = Array.isArray(student.groupIds)
          ? student.groupIds
          : [student.groupId].filter((id): id is string => Boolean(id));

        const isDirectGroupMatch =
          !sessionGroupId ||
          studentGroupIds.includes(sessionGroupId) ||
          student.groupId === sessionGroupId;

        const isStudentEnrolledInSession = isDirectGroupMatch;

        if (!allowCrossGroup && !isStudentEnrolledInSession && sessionGroupId && studentGroupId && sessionGroupId !== studentGroupId) {
          return {
            isCrossGroupPrompt: true,
            isDuplicate: false,
            message: 'طالب من خارج المجموعة',
            student: {
              id: studentId,
              fullName: resolvedStudentName,
              studentCode: student.studentCode || '',
              gradeLevel: student.gradeLevel || '',
            },
            studentGroup: {
              id: studentGroupId,
              name: studentGroupName,
              gradeLevel: student.gradeLevel,
            },
            sessionGroup: {
              id: sessionGroupId,
              name: sessionGroupName,
            },
          };
        }

        const existingRecord = reportData?.records?.find(
          (r: any) =>
            (r.studentId === studentId && (r.status === 'PRESENT' || r.attendanceStatus === 'PRESENT')) ||
            (effectiveToken && r.qrCodeToken === effectiveToken && (r.status === 'PRESENT' || r.attendanceStatus === 'PRESENT')),
        );

        const isQueued = await offlineDb.isAttendanceRecordedOffline(sessionId, studentId, effectiveToken);

        if (existingRecord || isQueued) {
          return {
            isDuplicate: true,
            isCrossGroupPrompt: false,
            message: 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
            student: { id: studentId, fullName: resolvedStudentName },
            sessionStats: reportData?.stats,
          };
        }

        const updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
          studentId,
          studentName: resolvedStudentName,
          studentCode: student.studentCode || '',
          status: 'PRESENT',
          recordingMethod: 'QR_SCAN',
          recordedAt: new Date().toISOString(),
          notes: allowCrossGroup && sessionGroupId !== studentGroupId
            ? `حضور استثنائي - المجموعة الأصلية: ${studentGroupName}`
            : undefined,
        });

        if (updatedReport) {
          queryClient.setQueryData(['sessions', sessionId, 'report'], updatedReport);
        }

        await syncEngine.enqueue(
          'attendance',
          API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
          'POST',
          {
            sessionId,
            qrCodeToken: effectiveToken,
            studentId,
            status: 'PRESENT',
            recordingMethod: 'QR_SCAN',
            allowCrossGroup: !!allowCrossGroup,
            isGuest: !!allowCrossGroup && sessionGroupId !== studentGroupId,
            originalGroupId: studentGroupId,
            notes: allowCrossGroup && sessionGroupId !== studentGroupId
              ? `حضور استثنائي / تعويض (المجموعة الأصلية: ${studentGroupName})`
              : undefined,
          },
        );

        return {
          isDuplicate: false,
          isCrossGroupPrompt: false,
          isCrossGroupSuccess: !!allowCrossGroup && sessionGroupId !== studentGroupId,
          isOfflineSaved: true,
          message: allowCrossGroup && sessionGroupId !== studentGroupId
            ? `تم تسجيل حضور استثنائي للطالب (${resolvedStudentName}) بنجاح 💾`
            : `تم رصد حضور الطالب (${resolvedStudentName}) بنجاح محلياً 💾`,
          student: { id: studentId, fullName: resolvedStudentName },
        };
      }

      try {
        return await scanQrAttendance(sessionId, effectiveToken, allowCrossGroup);
      } catch (error: any) {
        if (
          error?.response?.data?.error === 'STUDENT_NOT_ENROLLED' ||
          (error?.response?.data?.statusCode === 400 && error?.response?.data?.enrolledGroups)
        ) {
          const errData = error.response.data;
          return {
            isCrossGroupPrompt: true,
            isDuplicate: false,
            message: errData.message || 'طالب من خارج المجموعة',
            student: {
              id: errData.studentId || '',
              fullName: errData.studentName || 'الطالب',
              studentCode: errData.studentCode,
              gradeLevel: errData.gradeLevel,
            },
            studentGroup: {
              id: errData.originalGroupId || '',
              name: errData.originalGroupName || errData.enrolledGroups?.[0] || 'مجموعته الأصلية',
            },
            sessionGroup: {
              id: sessionId,
              name: 'المجموعة الحالية',
            },
          };
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const reportData: any = queryClient.getQueryData(['sessions', sessionId, 'report']);
          const allSessions = await offlineDb.getSessionsOffline();
          const sessionObj = allSessions.find((s) => s.id === sessionId);
          const sessionGroupId = reportData?.groupId || sessionObj?.groupId || '';

          const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken, sessionGroupId);
          if (!localMatch || !localMatch.student) {
            const err: any = new Error('بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.');
            err.code = 'STUDENT_NOT_FOUND';
            throw err;
          }

          const student = localMatch.student;
          const studentId = student.id;
          const resolvedStudentName = student.fullName || student.user?.fullName || 'طالب';
          const studentGroupId = localMatch.groupId || student.groupId || '';

          const studentGroupIds: string[] = Array.isArray(student.groupIds)
            ? student.groupIds
            : [student.groupId].filter((id): id is string => Boolean(id));

          const isDirectGroupMatch =
            !sessionGroupId ||
            studentGroupIds.includes(sessionGroupId) ||
            student.groupId === sessionGroupId;

          const isStudentEnrolledInSession = isDirectGroupMatch;

          if (!allowCrossGroup && !isStudentEnrolledInSession && sessionGroupId && studentGroupId && sessionGroupId !== studentGroupId) {
            return {
              isCrossGroupPrompt: true,
              isDuplicate: false,
              message: 'طالب من خارج المجموعة',
              student: {
                id: studentId,
                fullName: resolvedStudentName,
                studentCode: student.studentCode || '',
                gradeLevel: student.gradeLevel || '',
              },
              studentGroup: {
                id: studentGroupId,
                name: localMatch.groupName || 'مجموعته الأصلية',
              },
              sessionGroup: {
                id: sessionGroupId,
                name: 'المجموعة الحالية',
              },
            };
          }

          const isQueued = await offlineDb.isAttendanceRecordedOffline(sessionId, studentId, effectiveToken);
          if (isQueued) {
            return {
              isDuplicate: true,
              isCrossGroupPrompt: false,
              message: 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
              student: { id: studentId, fullName: resolvedStudentName },
            };
          }

          const updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
            studentId,
            studentName: resolvedStudentName,
            studentCode: student.studentCode || '',
            status: 'PRESENT',
            recordingMethod: 'QR_SCAN',
            recordedAt: new Date().toISOString(),
          });

          if (updatedReport) {
            queryClient.setQueryData(['sessions', sessionId, 'report'], updatedReport);
          }

          await syncEngine.enqueue(
            'attendance',
            API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
            'POST',
            {
              sessionId,
              qrCodeToken: effectiveToken,
              studentId,
              status: 'PRESENT',
              recordingMethod: 'QR_SCAN',
              allowCrossGroup: !!allowCrossGroup,
              isGuest: !!allowCrossGroup && sessionGroupId !== studentGroupId,
              originalGroupId: studentGroupId,
              notes: allowCrossGroup && sessionGroupId !== studentGroupId
                ? `حضور استثنائي / تعويض (المجموعة الأصلية: ${localMatch.groupName || 'أخرى'})`
                : undefined,
            },
          );

          return {
            isDuplicate: false,
            isCrossGroupPrompt: false,
            isOfflineSaved: true,
            message: 'تم حفظ الحضور محلياً بنجاح في انتظار الاتصال 💾',
            student: { id: studentId, fullName: resolvedStudentName },
          };
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export * from './useManualAttendanceMutation';

