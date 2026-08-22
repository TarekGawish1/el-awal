import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroupSessions,
  fetchTodaySessions,
  fetchSessionReport,
  scanQrAttendance,
  recordManualBatch,
} from '../api/attendance.api';
import { BatchAttendanceDto, ScanQrResponse } from '../types/attendance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export function useGroupSessions(groupId: string | null) {
  return useQuery({
    queryKey: ['groups', groupId, 'sessions'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getSessionsOffline(groupId || undefined);
      }
      try {
        const sessions = await fetchGroupSessions(groupId!);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions);
        }
        return sessions;
      } catch {
        return offlineDb.getSessionsOffline(groupId || undefined);
      }
    },
    enabled: !!groupId,
    networkMode: 'always',
    staleTime: 30 * 1000,
  });
}

export function useTodaySessions(
  academicStage?: string,
  gradeLevel?: string,
  academicYear?: string,
  academicTerm?: string,
) {
  return useQuery({
    queryKey: ['sessions', 'today', academicStage, gradeLevel, academicYear, academicTerm],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const sessions = await offlineDb.getSessionsOffline();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDayOfWeek = new Date().getDay();

        const todaySessions = sessions.filter((s) => {
          if (s.sessionDate) {
            return s.sessionDate.startsWith(todayStr);
          }
          if (s.dayOfWeek !== undefined) {
            return s.dayOfWeek === todayDayOfWeek;
          }
          return true;
        });

        const resultList = todaySessions.length > 0 ? todaySessions : sessions;
        return resultList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
      try {
        const sessions = await fetchTodaySessions(academicStage, gradeLevel, academicYear, academicTerm);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions);
        }
        return sessions;
      } catch {
        const sessions = await offlineDb.getSessionsOffline();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDayOfWeek = new Date().getDay();

        const todaySessions = sessions.filter((s) => {
          if (s.sessionDate) {
            return s.sessionDate.startsWith(todayStr);
          }
          if (s.dayOfWeek !== undefined) {
            return s.dayOfWeek === todayDayOfWeek;
          }
          return true;
        });

        const resultList = todaySessions.length > 0 ? todaySessions : sessions;
        return resultList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
    },
    networkMode: 'always',
    staleTime: 30 * 1000,
  });
}

export function useSessionReport(sessionId: string | null) {
  return useQuery<any>({
    queryKey: ['sessions', sessionId, 'report'],
    queryFn: async () => {
      if (!sessionId) return null;
      const cleanSessionId = String(sessionId).trim().toLowerCase();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      const buildOfflineReport = async () => {
        // 1. Check if we already have a cached report in memory / IndexedDB
        const cachedReport = await offlineDb.getSessionReport(cleanSessionId);

        // 2. Fetch session, group, and student roster offline
        const allSessions = await offlineDb.getSessionsOffline();
        const session = allSessions.find(
          (s) => String(s.id).trim().toLowerCase() === cleanSessionId,
        );
        const targetGroupId = session?.groupId || cachedReport?.groupId || '';
        let roster = targetGroupId ? await offlineDb.getRoster(targetGroupId) : null;
        const group = targetGroupId ? await offlineDb.getGroupByIdOffline(targetGroupId) : null;
        const groupStudents = targetGroupId
          ? await offlineDb.getStudentsOffline({ groupId: targetGroupId })
          : await offlineDb.getStudentsOffline();

        if (!roster && targetGroupId) {
          roster = {
            groupId: targetGroupId,
            groupName: group?.name || session?.group?.name || 'المجموعة الدراسية',
            gradeLevel: group?.gradeLevel || '',
            monthlyFee: group?.monthlyFee || 0,
            students: groupStudents.map((st) => ({
              id: st.id,
              fullName: st.fullName || st.user?.fullName || 'طالب',
              studentCode: st.studentCode || `STU-${st.id.slice(0, 6)}`,
              qrCodeToken: st.qrCodeToken || st.id,
              gradeLevel: st.gradeLevel || group?.gradeLevel || '',
              academicStatus: st.academicStatus || 'ACTIVE',
            })),
            updatedAt: Date.now(),
          };
        }

        // 3. Collect all enrolled students
        const allRosterStudents = roster?.students?.length
          ? roster.students
          : groupStudents.map((st) => ({
              id: st.id,
              fullName: st.fullName || st.user?.fullName || 'طالب',
              studentCode: st.studentCode || `STU-${st.id.slice(0, 6)}`,
              qrCodeToken: st.qrCodeToken || st.id,
              gradeLevel: st.gradeLevel || group?.gradeLevel || '',
              academicStatus: st.academicStatus || 'ACTIVE',
            }));

        // 4. Collect pending attendance mutations for this session
        const pendingMutations = await offlineDb.getPendingMutations();
        const sessionMutations = pendingMutations.filter(
          (m) =>
            m.domain === 'attendance' &&
            m.payload &&
            String(m.payload.sessionId || '').trim().toLowerCase() === cleanSessionId,
        );

        // Map of studentId -> attendance record from pending mutations or cached records
        const recordsMap = new Map<string, any>();

        // (a) First seed with existing records from cached report
        if (cachedReport?.records && Array.isArray(cachedReport.records)) {
          for (const r of cachedReport.records) {
            if (r.studentId) {
              recordsMap.set(String(r.studentId).trim(), r);
            }
          }
        }

        // (b) Overlay with pending mutations
        for (const mut of sessionMutations) {
          const p = mut.payload;
          if (p.studentId) {
            recordsMap.set(String(p.studentId).trim(), {
              id: mut.id,
              studentId: p.studentId,
              status: p.status || 'PRESENT',
              recordingMethod: p.recordingMethod || 'QR_SCAN',
              recordedAt: new Date(mut.clientTimestamp).toISOString(),
              notes: p.notes,
            });
          }
        }

        // 5. Build full records list for every enrolled student
        const fullRecords = allRosterStudents.map((st) => {
          const cleanStId = String(st.id).trim();
          const rec = recordsMap.get(cleanStId);
          return {
            id: rec?.id || `unrecorded-${st.id}`,
            studentId: st.id,
            studentCode: st.studentCode || '',
            fullName: st.fullName || 'طالب',
            phone: (st as any).phone || (st as any).user?.phone || null,
            status: rec?.status || null,
            recordingMethod: rec?.recordingMethod || null,
            recordedAt: rec?.recordedAt || null,
            notes: rec?.notes || null,
          };
        });

        // Also add any guest / cross-group students that attended
        recordsMap.forEach((rec, stId) => {
          if (!fullRecords.some((r) => String(r.studentId).trim() === stId)) {
            fullRecords.push({
              id: rec.id,
              studentId: stId,
              studentCode: rec.studentCode || '',
              fullName: rec.fullName || rec.studentName || 'طالب ضيف',
              phone: null,
              status: rec.status || 'PRESENT',
              recordingMethod: rec.recordingMethod || 'QR_SCAN',
              recordedAt: rec.recordedAt || new Date().toISOString(),
              notes: rec.notes || 'حضور استثنائي',
            });
          }
        });

        const totalEnrolled = Math.max(allRosterStudents.length, cachedReport?.metrics?.totalEnrolled || 0);
        const presentCount = fullRecords.filter((r) => r.status === 'PRESENT').length;
        const excusedCount = fullRecords.filter((r) => r.status === 'EXCUSED').length;
        const absentCount = fullRecords.filter((r) => r.status === 'ABSENT').length;
        const remainingUnrecorded = Math.max(0, totalEnrolled - presentCount - excusedCount - absentCount);
        const calculatedAbsent = absentCount + remainingUnrecorded;
        const attendanceRatePercentage =
          totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

        const builtReport = {
          sessionId: sessionId || '',
          sessionDate: session?.sessionDate || cachedReport?.sessionDate || new Date().toISOString(),
          topic: session?.topic || cachedReport?.topic || 'رصد الحضور',
          groupId: targetGroupId,
          groupName:
            roster?.groupName ||
            group?.name ||
            session?.group?.name ||
            cachedReport?.groupName ||
            'المجموعة الدراسية',
          metrics: {
            totalEnrolled,
            presentCount,
            absentCount: calculatedAbsent,
            excusedCount,
            attendanceRatePercentage,
          },
          session: session || cachedReport?.session || {
            id: sessionId,
            groupId: targetGroupId,
            sessionDate: new Date().toISOString(),
            topic: 'رصد الحضور',
            startTime: '16:00',
            endTime: '18:00',
          },
          group: group || cachedReport?.group || (roster ? { id: roster.groupId, name: roster.groupName, gradeLevel: roster.gradeLevel } : null),
          roster: allRosterStudents.map((s) => ({
            studentId: s.id,
            studentName: s.fullName,
            studentCode: s.studentCode,
            qrCodeToken: s.qrCodeToken,
            attendanceStatus: recordsMap.get(String(s.id).trim())?.status || 'ABSENT',
          })),
          records: fullRecords,
          stats: {
            totalEnrolled,
            totalPresent: presentCount,
            totalAbsent: calculatedAbsent,
          },
        };

        await offlineDb.cacheSessionReport(cleanSessionId, builtReport);
        return builtReport;
      };

      if (!isOnline) {
        return buildOfflineReport();
      }

      try {
        const data = await fetchSessionReport(sessionId!);
        if (data) {
          if (data.groupId && data.records) {
            offlineDb.cacheRoster({
              groupId: data.groupId,
              groupName: data.groupName || 'المجموعة الدراسية',
              students: data.records.map((r: any) => ({
                id: r.studentId || r.id,
                fullName: r.fullName || r.studentName || '',
                studentCode: r.studentCode,
                qrCodeToken: r.qrCodeToken || r.studentCode || r.studentId || r.id,
              })),
              updatedAt: Date.now(),
            });
          }
          await offlineDb.cacheSessionReport(cleanSessionId, data);
        }
        return data;
      } catch {
        return buildOfflineReport();
      }
    },
    enabled: !!sessionId,
    networkMode: 'always',
    staleTime: 30 * 1000,
  });
}

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
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // Resolve student offline
        const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken);
        const reportData: any = queryClient.getQueryData(['sessions', sessionId, 'report']);
        const allSessions = await offlineDb.getSessionsOffline();
        const sessionObj = allSessions.find((s) => s.id === sessionId);
        const sessionGroupId = reportData?.groupId || sessionObj?.groupId || '';
        const sessionGroupObj = sessionGroupId ? await offlineDb.getGroupByIdOffline(sessionGroupId) : null;
        const sessionGroupName = reportData?.groupName || sessionGroupObj?.name || 'المجموعة الحالية';

        const studentGroupId = localMatch?.groupId || localMatch?.student?.groupId || '';
        const studentGroupObj = studentGroupId ? await offlineDb.getGroupByIdOffline(studentGroupId) : null;
        const studentGroupName = localMatch?.groupName || studentGroupObj?.name || 'مجموعة أخرى';

        const resolvedStudentName =
          localMatch?.student?.fullName ||
          reportData?.roster?.find(
            (r: any) =>
              r.qrCodeToken === qrCodeToken ||
              r.studentCode === qrCodeToken ||
              r.studentId === qrCodeToken,
          )?.studentName ||
          'طالب';

        const studentId =
          localMatch?.student?.id ||
          reportData?.roster?.find(
            (r: any) =>
              r.qrCodeToken === qrCodeToken ||
              r.studentCode === qrCodeToken ||
              r.studentId === qrCodeToken,
          )?.studentId;

        // 1. Check Cohort Enrollment (External Student Detection)
        if (!allowCrossGroup && sessionGroupId && studentGroupId && sessionGroupId !== studentGroupId) {
          return {
            isCrossGroupPrompt: true,
            isDuplicate: false,
            message: 'طالب من خارج المجموعة',
            student: {
              id: studentId || qrCodeToken,
              fullName: resolvedStudentName,
              studentCode: localMatch?.student?.studentCode || '',
              gradeLevel: localMatch?.student?.gradeLevel || '',
            },
            studentGroup: {
              id: studentGroupId,
              name: studentGroupName,
              gradeLevel: localMatch?.student?.gradeLevel,
            },
            sessionGroup: {
              id: sessionGroupId,
              name: sessionGroupName,
            },
          };
        }

        // 2. Check duplicate in memory report data OR offline outbox mutations / stores
        const existingRecord = reportData?.records?.find(
          (r: any) =>
            (studentId && r.studentId === studentId && (r.status === 'PRESENT' || r.attendanceStatus === 'PRESENT')) ||
            (qrCodeToken && r.qrCodeToken === qrCodeToken && (r.status === 'PRESENT' || r.attendanceStatus === 'PRESENT')),
        );

        const isQueued = studentId
          ? await offlineDb.isAttendanceRecordedOffline(sessionId, studentId, qrCodeToken)
          : false;

        if (existingRecord || isQueued) {
          return {
            isDuplicate: true,
            isCrossGroupPrompt: false,
            message: 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
            student: { id: studentId || '', fullName: resolvedStudentName },
            sessionStats: reportData?.stats,
          };
        }

        // 3. Record attendance in offline database
        if (studentId) {
          const updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
            studentId,
            studentName: resolvedStudentName,
            studentCode: localMatch?.student?.studentCode || '',
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
        }

        // 4. Enqueue mutation into IndexedDB outbox
        await syncEngine.enqueue(
          'attendance',
          API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
          'POST',
          {
            sessionId,
            qrCodeToken,
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
          student: { id: studentId || '', fullName: resolvedStudentName },
        };
      }

      try {
        return await scanQrAttendance(sessionId, qrCodeToken, allowCrossGroup);
      } catch (error: any) {
        // Check if server rejected due to student not enrolled
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

        // Fallback to offline queue if network connection drops mid-scan
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(qrCodeToken);
          const studentId = localMatch?.student?.id || qrCodeToken;
          const resolvedStudentName = localMatch?.student?.fullName || 'طالب';

          const allSessions = await offlineDb.getSessionsOffline();
          const sessionObj = allSessions.find((s) => s.id === sessionId);
          const sessionGroupId = sessionObj?.groupId || '';
          const studentGroupId = localMatch?.groupId || localMatch?.student?.groupId || '';

          if (!allowCrossGroup && sessionGroupId && studentGroupId && sessionGroupId !== studentGroupId) {
            return {
              isCrossGroupPrompt: true,
              isDuplicate: false,
              message: 'طالب من خارج المجموعة',
              student: {
                id: studentId,
                fullName: resolvedStudentName,
                studentCode: localMatch?.student?.studentCode || '',
                gradeLevel: localMatch?.student?.gradeLevel || '',
              },
              studentGroup: {
                id: studentGroupId,
                name: localMatch?.groupName || 'مجموعته الأصلية',
              },
              sessionGroup: {
                id: sessionGroupId,
                name: 'المجموعة الحالية',
              },
            };
          }

          const isQueued = await offlineDb.isAttendanceRecordedOffline(sessionId, studentId, qrCodeToken);
          if (isQueued) {
            return {
              isDuplicate: true,
              isCrossGroupPrompt: false,
              message: 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
              student: { id: studentId || '', fullName: resolvedStudentName },
            };
          }

          const updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
            studentId,
            studentName: resolvedStudentName,
            studentCode: localMatch?.student?.studentCode || '',
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
              qrCodeToken,
              studentId,
              status: 'PRESENT',
              recordingMethod: 'QR_SCAN',
              allowCrossGroup: !!allowCrossGroup,
              isGuest: !!allowCrossGroup && sessionGroupId !== studentGroupId,
              originalGroupId: studentGroupId,
              notes: allowCrossGroup && sessionGroupId !== studentGroupId
                ? `حضور استثنائي / تعويض (المجموعة الأصلية: ${localMatch?.groupName || 'أخرى'})`
                : undefined,
            },
          );

          return {
            isDuplicate: false,
            isCrossGroupPrompt: false,
            isOfflineSaved: true,
            message: 'تم حفظ الحضور محلياً بنجاح في انتظار الاتصال 💾',
            student: { id: studentId || '', fullName: resolvedStudentName },
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

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: BatchAttendanceDto;
    }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // Enqueue batch manual attendance into outbox and record offline
        let updatedReport: any = null;
        for (const item of payload.records) {
          updatedReport = await offlineDb.recordAttendanceOffline(sessionId, {
            studentId: item.studentId,
            status: item.status,
            notes: item.notes,
            recordingMethod: 'MANUAL',
            recordedAt: new Date().toISOString(),
          });

          await syncEngine.enqueue(
            'attendance',
            API_ENDPOINTS.ATTENDANCE.MANUAL(sessionId),
            'POST',
            {
              sessionId,
              studentId: item.studentId,
              status: item.status,
              notes: item.notes,
              recordingMethod: 'MANUAL',
            },
          );
        }

        if (updatedReport) {
          queryClient.setQueryData(['sessions', sessionId, 'report'], updatedReport);
        }

        return {
          success: true,
          isOfflineSaved: true,
          message: 'تم حفظ الكشف اليدوي محلياً في انتظار المزامنة 💾',
        };
      }

      return recordManualBatch(sessionId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'report'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
