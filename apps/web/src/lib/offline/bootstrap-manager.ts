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

  /**
   * Executes full tenant bootstrap hydration or incremental delta sync.
   */
  public async performBootstrap(options?: {
    forceFull?: boolean;
    queryClient?: QueryClient;
  }): Promise<{ success: boolean; isDelta: boolean; counts?: Record<string, number> }> {
    if (this.isBootstrappingState) {
      return { success: false, isDelta: false };
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      this.notify('OFFLINE_FALLBACK', 100, 'الجهاز غير متصل، يتم الاعتماد على البيانات المحفوظة محلياً');
      return { success: true, isDelta: false };
    }

    this.isBootstrappingState = true;
    this.lastError = null;
    this.notify('START', 5, 'بدء تنزيل مساحة العمل للعمل بدون إنترنت...');

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

      // Robust payload extraction whether wrapped or unwrapped
      const payload =
        response.data && (response.data.students || response.data.groups || response.data.sessions || response.data.academicPeriod)
          ? response.data
          : response.students || response.groups
            ? response
            : response.data || response;

      const qc = options?.queryClient;

      // 1. Ingest Students
      this.notify('PROGRESS', 45, 'حفظ سجلات الطلاب وبطاقات الـ QR...');
      if (payload.students && payload.students.length > 0) {
        await offlineDb.bulkPutStudents(payload.students);
        if (qc) {
          qc.setQueryData(['students'], {
            data: payload.students,
            meta: { total: payload.students.length, hasMore: false },
          });
        }
      }

      // 2. Ingest Groups & Schedules
      this.notify('PROGRESS', 65, 'حفظ المجموعات الدراسية والجداول...');
      if (payload.groups && payload.groups.length > 0) {
        await offlineDb.bulkPutGroups(payload.groups);
        if (qc) {
          qc.setQueryData(['groups'], payload.groups);
        }
      }

      if (payload.schedules && payload.schedules.length > 0) {
        await offlineDb.bulkPutSchedules(payload.schedules);
      }

      // 3. Ingest Pre-generated Sessions
      this.notify('PROGRESS', 80, 'حفظ الحصص وسجلات الحضور والغياب...');
      if (payload.sessions && payload.sessions.length > 0) {
        await offlineDb.bulkPutSessions(payload.sessions);
      }

      // 4. Ingest Payments & Tuition
      if (payload.payments && payload.payments.length > 0) {
        await offlineDb.bulkPutPayments(payload.payments);
      }

      // 5. Ingest Assessments & Questions
      this.notify('PROGRESS', 90, 'حفظ بنوك الأسئلة والاختبارات...');
      if (payload.assessments && payload.assessments.length > 0) {
        await offlineDb.bulkPutAssessments(payload.assessments);
        if (qc) {
          qc.setQueryData(['assessments'], {
            data: payload.assessments,
            meta: { total: payload.assessments.length },
          });
        }
      }

      // 6. Ingest Educational Courses
      if (payload.courses && payload.courses.length > 0) {
        await offlineDb.bulkPutCourses(payload.courses);
        if (qc) {
          qc.setQueryData(['courses', 'catalog'], payload.courses);
        }
      }

      // 7. Ingest Academic Period
      if (payload.academicPeriod) {
        await offlineDb.setMetadata('academicPeriod', payload.academicPeriod);
        if (qc) {
          qc.setQueryData(['teachers', 'academic-period'], payload.academicPeriod);
        }
      }

      const syncTimestamp = response.timestamp || payload.timestamp || Date.now();
      const syncVersion = response.snapshotVersion || payload.snapshotVersion || 'v1';
      const isDelta = response.isDelta ?? payload.isDelta ?? false;

      // Record sync timestamp
      await offlineDb.setMetadata('lastBootstrapTimestamp', syncTimestamp);
      await offlineDb.setMetadata('syncVersion', syncVersion);

      const counts = {
        students: payload.students?.length || 0,
        groups: payload.groups?.length || 0,
        sessions: payload.sessions?.length || 0,
        payments: payload.payments?.length || 0,
        assessments: payload.assessments?.length || 0,
      };

      this.notify('SUCCESS', 100, 'تم تجهيز مساحة العمل بنجاح والجاهزية للعمل بدون إنترنت 🚀', {
        counts,
        isDelta,
      });

      return {
        success: true,
        isDelta,
        counts,
      };
    } catch (err: any) {
      this.lastError = err?.message || 'حدث خطأ أثناء تنزيل بيانات العمل بدون إنترنت';
      this.notify('ERROR', 0, this.lastError!);
      return { success: false, isDelta: false };
    } finally {
      this.isBootstrappingState = false;
    }
  }
}

export const bootstrapManager = new BootstrapManager();
