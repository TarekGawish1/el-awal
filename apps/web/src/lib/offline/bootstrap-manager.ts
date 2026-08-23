/**
 * Zero Cold-Start Bootstrap Manager for El Awal Platform
 * Orchestrates pre-caching of all scoped domain entities upon login.
 */

import { offlineDb } from './db';
import { API_ENDPOINTS } from '../api/endpoints';
import { apiClient } from '../api/client';
import { QueryClient } from '@tanstack/react-query';

export type BootstrapEventType = 'START' | 'PROGRESS' | 'SUCCESS' | 'ERROR' | 'OFFLINE_FALLBACK';

export interface BootstrapEvent {
  type: BootstrapEventType;
  percentage: number;
  message: string;
  data?: any;
}

export type BootstrapListener = (event: BootstrapEvent) => void;

class BootstrapManager {
  private isBootstrappingState: boolean = false;
  private lastError: string | null = null;
  private listeners: Set<BootstrapListener> = new Set();
  /** Wall-clock time of the last successful bootstrap (full or delta). */
  private lastBootstrapAt: number = 0;
  /** Minimum milliseconds between two delta bootstrap calls.  Full bootstrap
   *  (forceFull) and explicit skipCooldown calls always bypass this. */
  private readonly MIN_DELTA_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

  public isBootstrapping(): boolean {
    return this.isBootstrappingState;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public subscribe(listener: BootstrapListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(type: BootstrapEventType, percentage: number, message: string, data?: any) {
    this.listeners.forEach((listener) => {
      try {
        listener({ type, percentage, message, data });
      } catch (e) {
        console.error('Error in bootstrap listener:', e);
      }
    });
  }

  public getLastBootstrapAt(): number {
    return this.lastBootstrapAt;
  }

  /**
   * Executes full tenant bootstrap hydration or incremental delta sync.
   *
   * @param options.forceFull  Ignore lastBootstrapTimestamp and download the full snapshot.
   * @param options.skipCooldown  Bypass the 3-minute cooldown (e.g. for explicit bi-directional
   *   syncs where we always want a fresh pull, but still use delta).
   * @param options.queryClient  React Query client to update in-memory caches.
   */
  public async performBootstrap(options?: {
    forceFull?: boolean;
    skipCooldown?: boolean;
    queryClient?: QueryClient;
  }): Promise<{ success: boolean; isDelta: boolean; counts?: Record<string, number> }> {
    if (this.isBootstrappingState) {
      return { success: false, isDelta: false };
    }

    // Skip if last bootstrap was very recent, unless the caller explicitly opted out
    // of the cooldown or requested a full re-download.
    if (!options?.forceFull && !options?.skipCooldown) {
      const elapsed = Date.now() - this.lastBootstrapAt;
      if (elapsed < this.MIN_DELTA_INTERVAL_MS) {
        return { success: true, isDelta: true };
      }
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      this.notify('OFFLINE_FALLBACK', 100, 'الجهاز غير متصل، يتم الاعتماد على البيانات المحفوظة محلياً');
      return { success: true, isDelta: false };
    }

    this.isBootstrappingState = true;
    this.lastError = null;
    this.notify('START', 0, 'بدء تنزيل مساحة العمل للعمل بدون إنترنت...');

    try {
      const lastSyncTime = options?.forceFull
        ? null
        : await offlineDb.getMetadata<number>('lastBootstrapTimestamp');

      const queryUrl = lastSyncTime
        ? `${API_ENDPOINTS.SYNC.BOOTSTRAP}?since=${lastSyncTime}`
        : API_ENDPOINTS.SYNC.BOOTSTRAP;

      this.notify('PROGRESS', 25, 'جاري استقبال وتجهيز بيانات المجموعات والطلاب...');

      // Abort after 12s to prevent indefinite hanging on flaky networks
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال بخادم المزامنة')), 12000),
      );

      const response = await Promise.race([
        apiClient<any>(queryUrl, { method: 'GET' }),
        timeoutPromise,
      ]) as any;

      if (!response) {
        throw new Error('استجابة غير صالحة من خادم المزامنة');
      }

      // Robust payload extraction handling any nesting envelope (e.g. response.data.data, response.data, or direct)
      const rootData = response?.data?.data || response?.data || response || {};

      // Determine whether this is a delta response BEFORE ingesting data so we
      // can choose the correct merge strategy (upsert-only vs. reconcile+prune).
      const isDeltaResponse = response.isDelta ?? rootData.isDelta ?? false;

      const payload = {
        students: Array.isArray(rootData.students) ? rootData.students : Array.isArray(response?.students) ? response.students : [],
        groups: Array.isArray(rootData.groups) ? rootData.groups : Array.isArray(response?.groups) ? response.groups : [],
        schedules: Array.isArray(rootData.schedules) ? rootData.schedules : Array.isArray(response?.schedules) ? response.schedules : [],
        sessions: Array.isArray(rootData.sessions) ? rootData.sessions : Array.isArray(response?.sessions) ? response.sessions : [],
        payments: Array.isArray(rootData.payments) ? rootData.payments : Array.isArray(response?.payments) ? response.payments : [],
        assessments: Array.isArray(rootData.assessments) ? rootData.assessments : Array.isArray(response?.assessments) ? response.assessments : [],
        courses: Array.isArray(rootData.courses) ? rootData.courses : Array.isArray(response?.courses) ? response.courses : [],
        booklets: Array.isArray(rootData.booklets) ? rootData.booklets : Array.isArray(response?.booklets) ? response.booklets : [],
        attendance: Array.isArray(rootData.attendance) ? rootData.attendance : Array.isArray(response?.attendance) ? response.attendance : [],
        academicPeriod: rootData.academicPeriod || response?.academicPeriod || {
          academicYear: '2026-2027',
          academicTerm: 'FIRST_TERM',
          activeAcademicYear: '2026-2027',
          activeAcademicTerm: 'FIRST_TERM',
        },
      };

      const qc = options?.queryClient;

      this.notify('PROGRESS', 50, 'حفظ سجلات الطلاب والمجموعات والحصص محلياً...');

      // 1. Ingest Students
      // Full snapshot → reconcile with server and prune orphaned local records.
      // Delta snapshot → upsert only; never prune, because the server only returns
      //   the changed subset and deleting the rest would corrupt local state.
      if (payload.students.length > 0) {
        if (isDeltaResponse) {
          await offlineDb.bulkPutStudents(payload.students);
        } else {
          await offlineDb.syncStudentsSnapshot(payload.students);
          if (qc) {
            qc.setQueryData(['students'], {
              data: payload.students,
              meta: { total: payload.students.length, hasMore: false },
            });
          }
        }
      }

      // 2. Ingest Groups & Schedules
      if (payload.groups.length > 0) {
        await offlineDb.bulkPutGroups(payload.groups);
        if (qc) {
          qc.setQueryData(['groups'], payload.groups);
        }
      }

      if (payload.schedules.length > 0) {
        await offlineDb.bulkPutSchedules(payload.schedules);
      }

      // 3. Ingest Pre-generated Sessions
      if (payload.sessions.length > 0) {
        await offlineDb.bulkPutSessions(payload.sessions);
      }

      this.notify('PROGRESS', 75, 'حفظ السجلات المالية والمذكرات والاختبارات محلياً...');

      // 4. Ingest Payments & Tuition
      if (payload.payments.length > 0) {
        await offlineDb.bulkPutPayments(payload.payments);
      }

      // 5. Ingest Booklets
      if (payload.booklets.length > 0) {
        await offlineDb.bulkPutBooklets(payload.booklets);
        if (qc) {
          qc.setQueryData(['booklets'], payload.booklets);
          qc.setQueryData(['booklets', undefined], payload.booklets);
        }
      }

      // 6. Ingest Attendance Records
      if (payload.attendance.length > 0) {
        for (const att of payload.attendance) {
          if (att.sessionId) {
            await offlineDb.recordAttendanceOffline(att.sessionId, {
              studentId: att.studentId,
              status: att.status || 'PRESENT',
              recordingMethod: att.recordingMethod || 'QR_SCAN',
              recordedAt: att.recordedAt,
              studentName: att.student?.user?.fullName,
            });
          }
        }
      }

      // 7. Ingest Assessments & Questions
      if (payload.assessments.length > 0) {
        await offlineDb.bulkPutAssessments(payload.assessments);
        if (qc) {
          qc.setQueryData(['assessments'], {
            data: payload.assessments,
            meta: { total: payload.assessments.length },
          });
        }
      }

      // 8. Ingest Educational Courses
      if (payload.courses.length > 0) {
        await offlineDb.bulkPutCourses(payload.courses);
        if (qc) {
          qc.setQueryData(['courses', 'catalog'], payload.courses);
        }
      }

      // 9. Ingest Academic Period
      if (payload.academicPeriod) {
        await offlineDb.setMetadata('academicPeriod', payload.academicPeriod);
        if (qc) {
          qc.setQueryData(['teacher', 'academic-period'], payload.academicPeriod);
          qc.setQueryData(['teachers', 'academic-period'], payload.academicPeriod);
        }
      }

      const syncTimestamp = response.timestamp || rootData.timestamp || Date.now();
      const syncVersion = response.snapshotVersion || rootData.snapshotVersion || 'v1';

      // Record sync timestamp and mark the local wall clock for the cooldown guard.
      await offlineDb.setMetadata('lastBootstrapTimestamp', syncTimestamp);
      await offlineDb.setMetadata('syncVersion', syncVersion);
      this.lastBootstrapAt = Date.now();

      const counts = {
        students: payload.students.length,
        groups: payload.groups.length,
        sessions: payload.sessions.length,
        payments: payload.payments.length,
        booklets: payload.booklets.length,
        assessments: payload.assessments.length,
      };

      this.isBootstrappingState = false;
      this.notify('SUCCESS', 100, 'تم تجهيز مساحة العمل بنجاح والجاهزية للعمل بدون إنترنت 🚀', {
        counts,
        isDelta: isDeltaResponse,
      });

      return {
        success: true,
        isDelta: isDeltaResponse,
        counts,
      };
    } catch (err: any) {
      this.isBootstrappingState = false;
      this.lastError = err?.message || 'حدث خطأ أثناء تنزيل بيانات العمل بدون إنترنت';
      this.notify('ERROR', 0, this.lastError!);
      return { success: false, isDelta: false };
    } finally {
      this.isBootstrappingState = false;
    }
  }
}

export const bootstrapManager = new BootstrapManager();
