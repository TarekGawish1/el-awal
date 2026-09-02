import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  private readonly IGNORED_PATHS = [
    '/api/health',
    '/api/v1/health',
    '/api/auth/login',
    '/api/v1/auth/login',
    '/api/auth/refresh',
    '/api/v1/auth/refresh',
    '/api/audit-logs',
    '/api/v1/audit-logs',
    '/api/notifications',
    '/api/v1/notifications',
    '/api/sync',
    '/api/v1/sync',
  ];

  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
    'secret',
  ]);

  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.slice(0, 10).map((i) => this.sanitize(i));
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (this.SENSITIVE_KEYS.has(k.toLowerCase())) {
        clean[k] = '********';
      } else if (typeof v === 'object' && v !== null) {
        clean[k] = this.sanitize(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }

  private resolveAction(method: string, url: string): AuditAction | null {
    if (url.includes('/export') || url.includes('/download')) return AuditAction.EXPORT;
    if (url.includes('/attendance/scan') || url.includes('/scan')) return AuditAction.SCAN_ATTENDANCE;
    if (url.includes('/payments') && method === 'POST') return AuditAction.RECORD_PAYMENT;
    if (url.includes('/grade') || url.includes('/evaluate')) return AuditAction.GRADE_SUBMISSION;

    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return null;
    }
  }

  private resolveEntityType(url: string): string {
    // Strip /api/ and optional version prefix e.g. /api/v1/ or /api/
    const cleanUrl = url.replace(/^\/api\/(v\d+\/)?/, '').replace(/^\/api\//, '').split('?')[0];
    const segment = cleanUrl.split('/')[0] || 'SYSTEM';

    const entityMap: Record<string, string> = {
      students: 'STUDENT',
      teachers: 'TEACHER',
      assistants: 'ASSISTANT',
      groups: 'GROUP',
      schedules: 'SCHEDULE',
      attendance: 'ATTENDANCE',
      courses: 'COURSE',
      content: 'CONTENT',
      assessments: 'ASSESSMENT',
      payments: 'PAYMENT',
      notifications: 'NOTIFICATION',
      booklets: 'BOOKLET',
      certificates: 'CERTIFICATE',
      settings: 'SETTING',
      auth: 'AUTH',
    };

    return entityMap[segment.toLowerCase()] || (segment.toLowerCase() === 'v1' ? 'SYSTEM' : segment.toUpperCase());
  }

  private generateDescription(
    userName: string,
    userRole: string,
    action: AuditAction,
    entityType: string,
    body: any,
    params: any,
    resBody: any,
  ): string {
    const roleLabel = userRole === 'SECRETARIAT' ? 'المساعد' : userRole === 'TEACHER' ? 'المعلم' : 'المستخدم';
    const performer = `${roleLabel} ${userName}`;

    const entityLabels: Record<string, string> = {
      STUDENT: 'طالب',
      ASSISTANT: 'مساعد',
      TEACHER: 'معلم',
      GROUP: 'مجموعة دراسية',
      SCHEDULE: 'مواعيد حصص',
      ATTENDANCE: 'سجل حضور وغياب',
      COURSE: 'كورس تعليمي',
      CONTENT: 'محتوى دراسي',
      ASSESSMENT: 'اختبار أو واجب',
      PAYMENT: 'مصروفات دراسية',
      NOTIFICATION: 'إشعار',
      BOOKLET: 'مذكرة دراسية',
      CERTIFICATE: 'شهادة تقدير',
      SETTING: 'إعدادات النظام',
      AUTH: 'جلسة تسجيل دخول',
      SYSTEM: 'النظام',
    };

    const entityLabel = entityLabels[entityType] || entityType;
    const targetName =
      body?.fullName ||
      body?.name ||
      body?.title ||
      body?.studentName ||
      resBody?.fullName ||
      resBody?.name ||
      resBody?.title ||
      '';
    const targetSuffix = targetName ? ` (${targetName})` : '';

    switch (action) {
      case AuditAction.CREATE:
        if (entityType === 'STUDENT') return `قام ${performer} بتسجيل طالب جديد${targetSuffix}`;
        if (entityType === 'GROUP') return `قام ${performer} بإنشاء مجموعة دراسية جديدة${targetSuffix}`;
        if (entityType === 'BOOKLET') return `قام ${performer} بإضافة مذكرة دراسية جديدة${targetSuffix}`;
        if (entityType === 'ASSISTANT') return `قام ${performer} بإضافة وتعيين مساعد جديد${targetSuffix}`;
        if (entityType === 'PAYMENT') return `قام ${performer} بتسجيل واستلام دفعة مصروفات${targetSuffix}`;
        if (entityType === 'ATTENDANCE') return `قام ${performer} بتسجيل حضور الحصة`;
        if (entityType === 'ASSESSMENT') return `قام ${performer} بنشر اختبار أو واجب جديد${targetSuffix}`;
        if (entityType === 'COURSE') return `قام ${performer} بإنشاء كورس تعليمي جديد${targetSuffix}`;
        return `قام ${performer} بإضافة ${entityLabel} جديد${targetSuffix}`;

      case AuditAction.UPDATE:
        if (entityType === 'ATTENDANCE') return `قام ${performer} بتحديث درجات وسجل حضور الحصة`;
        if (entityType === 'ASSISTANT') return `قام ${performer} بتعديل بيانات وصلاحيات المساعد${targetSuffix}`;
        return `قام ${performer} بتعديل بيانات ${entityLabel}${targetSuffix}`;

      case AuditAction.DELETE:
        return `قام ${performer} بحذف ${entityLabel}${targetSuffix}`;

      case AuditAction.SCAN_ATTENDANCE:
        return `قام ${performer} برصد حضور الطالب${targetSuffix} عبر مسح كود الـ QR`;

      case AuditAction.RECORD_PAYMENT: {
        const amount = body?.amountPaid || body?.amount || resBody?.amountPaid || resBody?.amount;
        const amountText = amount ? ` بمبلغ ${amount} ج.م` : '';
        return `قام ${performer} بتسجيل واستلام دفعة مالية${targetSuffix}${amountText}`;
      }

      case AuditAction.GRADE_SUBMISSION:
        return `قام ${performer} برصد وتصحيح درجات ${entityLabel}${targetSuffix}`;

      case AuditAction.EXPORT:
        return `قام ${performer} بتصدير كشف وبيانات ${entityLabel}`;

      default:
        return `قام ${performer} بإجراء ${action} على ${entityLabel}${targetSuffix}`;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, originalUrl, body, params, ip, headers } = req;

    // Skip ignored paths
    if (this.IGNORED_PATHS.some((p) => originalUrl.startsWith(p))) {
      return next.handle();
    }

    const action = this.resolveAction(method, originalUrl);
    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (resBody) => {
          const user = (req as any).user;
          if (!user) return; // Only log authenticated actions

          // Only audit activities by TEACHER or SECRETARIAT (or Admins)
          if (user.role !== UserRole.TEACHER && user.role !== UserRole.SECRETARIAT) {
            return;
          }

          const entityType = this.resolveEntityType(originalUrl);
          const userName = user.fullName || user.email || 'مستخدم';
          const description = this.generateDescription(
            userName,
            user.role,
            action,
            entityType,
            body,
            params,
            resBody,
          );

          const entityId = params?.id || resBody?.id || body?.id || null;
          const entityName = body?.fullName || body?.name || body?.title || resBody?.fullName || resBody?.name || resBody?.title || null;

          this.auditService.logActivity({
            userId: user.id,
            userRole: user.role,
            userName,
            action,
            entityType,
            entityId: entityId ? String(entityId) : undefined,
            entityName: entityName ? String(entityName) : undefined,
            description,
            details: {
              path: originalUrl,
              method,
              params,
              payload: this.sanitize(body),
            },
            ipAddress: ip || (headers['x-forwarded-for'] as string) || undefined,
            userAgent: headers['user-agent'] || undefined,
          });
        },
        error: () => {},
      }),
    );
  }
}
