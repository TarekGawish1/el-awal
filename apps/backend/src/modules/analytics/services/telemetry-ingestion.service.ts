import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { UserRole, Prisma } from "@prisma/client";
import { PrismaService } from "../../../core/database/prisma.service";
import { GeoLocationService } from "./geo-location.service";
import { StartSessionDto, PingSessionDto } from "../dto/analytics.dto";
import { RecordPageViewParams } from "../types/analytics.types";
import * as crypto from "crypto";

@Injectable()
export class TelemetryIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryIngestionService.name);
  private readonly HASH_SALT =
    process.env.ANALYTICS_SALT || "el-awal-analytics-salt-2026";

  private pageViewBuffer: Prisma.PageViewCreateManyInput[] = [];
  private landingVisitBuffer: Prisma.LandingVisitCreateManyInput[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private readonly FLUSH_INTERVAL_MS = 20_000;
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly BUFFER_CAP = 1000;

  private readonly userRoleCache = new Map<string, { role: UserRole; expiresAt: number }>();
  private readonly userTenantCache = new Map<string, { tenantId: string | null; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => {
      void this.flushBuffers();
    }, this.FLUSH_INTERVAL_MS);
    if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushBuffers();
  }

  public async flushBuffers(): Promise<void> {
    if (this.isFlushing) return;
    if (this.pageViewBuffer.length === 0 && this.landingVisitBuffer.length === 0) return;

    this.isFlushing = true;
    const pageViewsToInsert = [...this.pageViewBuffer];
    const landingVisitsToInsert = [...this.landingVisitBuffer];
    this.pageViewBuffer = [];
    this.landingVisitBuffer = [];

    try {
      const promises: Promise<any>[] = [];
      if (pageViewsToInsert.length > 0) {
        promises.push(
          this.prisma.pageView.createMany({
            data: pageViewsToInsert,
            skipDuplicates: true,
          }),
        );
      }
      if (landingVisitsToInsert.length > 0) {
        promises.push(
          this.prisma.landingVisit.createMany({
            data: landingVisitsToInsert,
            skipDuplicates: true,
          }),
        );
      }
      await Promise.all(promises);
      this.logger.debug(
        `[Analytics] Flushed batch: ${pageViewsToInsert.length} pageViews, ${landingVisitsToInsert.length} landingVisits`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to flush analytics batch: ${err?.message}`);
      const availablePvSlots = Math.max(0, this.BUFFER_CAP - this.pageViewBuffer.length);
      if (availablePvSlots > 0 && pageViewsToInsert.length > 0) {
        this.pageViewBuffer.unshift(...pageViewsToInsert.slice(0, availablePvSlots));
      }
      const availableLvSlots = Math.max(0, this.BUFFER_CAP - this.landingVisitBuffer.length);
      if (availableLvSlots > 0 && landingVisitsToInsert.length > 0) {
        this.landingVisitBuffer.unshift(...landingVisitsToInsert.slice(0, availableLvSlots));
      }
    } finally {
      this.isFlushing = false;
    }
  }

  public generateVisitorHash(
    ip?: string,
    userAgent?: string,
    visitorId?: string,
  ): string {
    const cleanIp = (ip || "127.0.0.1").replace(/^::ffff:/, "").trim();
    const cleanUa = (userAgent || "unknown").trim();
    const clientIdentifier =
      visitorId && visitorId.trim()
        ? `vid::${visitorId.trim()}`
        : `${cleanIp}::${cleanUa}`;
    return crypto
      .createHash("sha256")
      .update(`${clientIdentifier}::${this.HASH_SALT}`)
      .digest("hex");
  }

  public async recordPageView(params: RecordPageViewParams): Promise<void> {
    try {
      if (
        params.path?.startsWith("/teacher") ||
        params.path?.startsWith("/secretariat") ||
        params.path?.startsWith("/assistant") ||
        params.path?.startsWith("/admin")
      ) {
        return;
      }

      if (params.userId) {
        const now = Date.now();
        const cached = this.userRoleCache.get(params.userId);
        let role = cached && cached.expiresAt > now ? cached.role : null;

        if (!role) {
          const user = await this.prisma.user.findUnique({
            where: { id: params.userId },
            select: { role: true },
          });
          if (user?.role) {
            role = user.role;
            this.userRoleCache.set(params.userId, {
              role,
              expiresAt: now + 5 * 60 * 1000,
            });
          }
        }

        if (
          role === UserRole.TEACHER ||
          role === UserRole.SECRETARIAT
        ) {
          return;
        }
      }

      const visitorHash = this.generateVisitorHash(
        params.ipAddress,
        params.userAgent,
        params.visitorId,
      );
      const isLanding =
        params.isLandingPage ??
        (params.path === "/" ||
          params.path === "" ||
          params.path.startsWith("/#"));

      const geo = await this.geoLocationService.resolveAsync(
        params.ipAddress,
        params.headers || {},
        {
          city: params.city,
          country: params.country,
        },
      );

      if (isLanding && this.landingVisitBuffer.length < this.BUFFER_CAP) {
        this.landingVisitBuffer.push({
          visitorHash,
          path: (params.path || "/").slice(0, 500),
          country: geo.country,
          city: geo.city,
        });
      }

      let effectiveTenantId = params.tenantId || null;
      if (!effectiveTenantId && params.userId) {
        effectiveTenantId = await this.resolveUserTenantId(params.userId);
      }

      if (this.pageViewBuffer.length < this.BUFFER_CAP) {
        this.pageViewBuffer.push({
          path: (params.path || "/").slice(0, 500),
          referrer: params.referrer ? params.referrer.slice(0, 500) : null,
          userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
          visitorHash,
          isLandingPage: isLanding,
          tenantId: effectiveTenantId,
          userId: params.userId || null,
          metadata: {
            ...(params.metadata || {}),
            country: geo.country,
            city: geo.city,
          },
        });
      }

      if (this.pageViewBuffer.length >= this.MAX_BUFFER_SIZE) {
        setImmediate(() => {
          void this.flushBuffers();
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to record page view telemetry: ${err?.message}`);
    }
  }

  public async startSession(
    userId: string,
    dto: StartSessionDto,
    ipAddress?: string,
    userAgent?: string,
    headers: Record<string, any> = {},
  ): Promise<{ sessionId: string; country: string; city: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (
      user?.role === UserRole.TEACHER ||
      user?.role === UserRole.SECRETARIAT
    ) {
      return { sessionId: "teacher-excluded", country: "مصر", city: "القاهرة" };
    }

    const geo = await this.geoLocationService.resolveAsync(ipAddress, headers, {
      city: dto.city,
      country: dto.country,
    });

    const effectiveTenantId =
      dto.tenantId || (await this.resolveUserTenantId(userId));

    // Reuse existing active session if user was active within the standard 30-minute window
    if (typeof this.prisma.userSession.findFirst === "function") {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentSession = await this.prisma.userSession.findFirst({
        where: {
          userId,
          lastActiveAt: { gte: thirtyMinutesAgo },
        },
        orderBy: { lastActiveAt: "desc" },
      });

      if (recentSession) {
        return {
          sessionId: recentSession.id,
          country: recentSession.country || geo.country,
          city: recentSession.city || geo.city,
        };
      }
    }

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        tenantId: effectiveTenantId,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        durationSeconds: 0,
        country: geo.country,
        city: geo.city,
        ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });

    const visitorHash = this.generateVisitorHash(
      ipAddress,
      userAgent,
      dto.visitorId,
    );

    try {
      await this.prisma.pageView.updateMany({
        where: {
          visitorHash,
          userId: null,
        },
        data: {
          userId,
        },
      });
    } catch {
      // safe fallback
    }

    this.logger.debug(
      `[Session] Started session ${session.id} for user ${userId} in ${geo.city}, ${geo.country}`,
    );
    return {
      sessionId: session.id,
      country: geo.country,
      city: geo.city,
    };
  }

  public async pingSession(
    dto: PingSessionDto,
  ): Promise<{ success: boolean; totalDurationSeconds: number }> {
    const safeIncrement = Math.min(Math.max(dto.elapsedSeconds || 30, 1), 60);

    try {
      const session = await this.prisma.userSession.update({
        where: { id: dto.sessionId },
        data: {
          lastActiveAt: new Date(),
          durationSeconds: { increment: safeIncrement },
        },
      });

      return {
        success: true,
        totalDurationSeconds: session.durationSeconds,
      };
    } catch (err: any) {
      this.logger.debug(
        `Failed to ping session ${dto.sessionId}: ${err?.message}`,
      );
      return { success: false, totalDurationSeconds: 0 };
    }
  }

  public async resolveUserTenantId(userId: string): Promise<string | null> {
    if (!userId) return null;
    const now = Date.now();
    const cached = this.userTenantCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.tenantId;
    }

    try {
      if (typeof this.prisma.user?.findUnique !== 'function') return null;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          teacherProfile: { select: { id: true } },
          studentProfile: {
            select: {
              groupEnrollments: {
                where: { status: 'ACTIVE' },
                take: 1,
                select: { group: { select: { teacherId: true } } },
              },
              courseEnrollments: {
                where: { status: 'ACTIVE' },
                take: 1,
                select: { course: { select: { teacherId: true } } },
              },
            },
          },
          parentProfile: {
            select: {
              studentLinks: {
                take: 1,
                select: {
                  student: {
                    select: {
                      groupEnrollments: {
                        where: { status: 'ACTIVE' },
                        take: 1,
                        select: { group: { select: { teacherId: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      let resolvedTenantId: string | null = null;
      if (user?.role === UserRole.TEACHER) {
        resolvedTenantId = user.teacherProfile?.id || userId;
      } else if (user?.role === UserRole.STUDENT) {
        resolvedTenantId =
          user.studentProfile?.groupEnrollments?.[0]?.group?.teacherId ||
          user.studentProfile?.courseEnrollments?.[0]?.course?.teacherId ||
          null;
      } else if (user?.role === UserRole.PARENT) {
        resolvedTenantId =
          user.parentProfile?.studentLinks?.[0]?.student?.groupEnrollments?.[0]?.group?.teacherId ||
          null;
      }

      if (!resolvedTenantId && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        const defaultTeacher = await this.prisma.teacherProfile.findFirst({
          select: { id: true },
        });
        if (defaultTeacher) {
          resolvedTenantId = defaultTeacher.id;
        }
      }

      this.userTenantCache.set(userId, {
        tenantId: resolvedTenantId,
        expiresAt: now + 30 * 60 * 1000,
      });

      return resolvedTenantId;
    } catch {
      return null;
    }
  }

  public async recordPageEngagement(params: {
    visitorId?: string;
    path: string;
    durationSeconds: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; duration: number }> {
    try {
      if (!params.durationSeconds || params.durationSeconds <= 0) {
        return { success: true, duration: 0 };
      }

      if (
        params.path?.startsWith("/teacher") ||
        params.path?.startsWith("/secretariat") ||
        params.path?.startsWith("/assistant") ||
        params.path?.startsWith("/admin")
      ) {
        return { success: true, duration: 0 };
      }

      const visitorHash = this.generateVisitorHash(
        params.ipAddress,
        params.userAgent,
        params.visitorId,
      );
      const cappedDuration = Math.min(Math.round(params.durationSeconds), 7200);

      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      let recentView = await this.prisma.pageView.findFirst({
        where: {
          visitorHash,
          path: params.path,
          createdAt: { gte: fourHoursAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!recentView) {
        recentView = await this.prisma.pageView.findFirst({
          where: {
            visitorHash,
            createdAt: { gte: fourHoursAgo },
          },
          orderBy: { createdAt: "desc" },
        });
      }

      if (recentView) {
        const existingMeta = (recentView.metadata as Record<string, any>) || {};
        const currentActiveSecs = Number(existingMeta.activeDurationSeconds) || 0;
        const newDuration = Math.max(currentActiveSecs, cappedDuration);

        await this.prisma.pageView.update({
          where: { id: recentView.id },
          data: {
            metadata: {
              ...existingMeta,
              activeDurationSeconds: newDuration,
            },
          },
        });

        return { success: true, duration: newDuration };
      }

      return { success: true, duration: cappedDuration };
    } catch {
      return { success: false, duration: 0 };
    }
  }
}
