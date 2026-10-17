import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncMutationItemDto } from '../dto/sync-batch.dto';
import { GroupEnrollmentStatus } from '@prisma/client';
import {
  handleHomeworkOnsiteMutation,
  handleAttendanceMutation,
} from './sync-mutation-handlers';

@Injectable()
export class SyncMutationsService {
  private readonly logger = new Logger(SyncMutationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async processMutationBatch(
    user: AuthenticatedUser,
    mutations: SyncMutationItemDto[] | any[],
  ): Promise<Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>> {
    const results: Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }> = [];

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return results;
    }

    const recorderId = user?.id || 'system';

    // Batch prefetch sessions and students to eliminate N+1 roundtrips in mutation batch processing
    const sessionIds = Array.from(new Set(
      mutations.map((m) => m?.payload?.sessionId).filter(Boolean) as string[]
    ));
    const preloadedSessions = sessionIds.length > 0 && typeof this.prisma.lessonSession?.findMany === 'function'
      ? await this.prisma.lessonSession.findMany({
          where: { id: { in: sessionIds } },
          select: {
            id: true,
            groupId: true,
            group: {
              select: { teacherId: true },
            },
          },
        }).catch(() => [])
      : [];
    const sessionMap = new Map(preloadedSessions.map((s) => [s.id, s]));

    const lookupTokens = Array.from(new Set(
      mutations.flatMap((m) => {
        const p = m?.payload || {};
        return [p.studentId, p.qrCodeToken].filter(Boolean).map((t: string) => String(t).trim());
      })
    ));

    const preloadedStudents = lookupTokens.length > 0 && typeof this.prisma.studentProfile?.findMany === 'function'
      ? await this.prisma.studentProfile.findMany({
          where: {
            OR: [
              { id: { in: lookupTokens.filter((t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) } },
              { qrCodeToken: { in: lookupTokens } },
              { studentCode: { in: lookupTokens } },
            ],
          },
          include: {
            user: { select: { isActive: true } },
            groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
          },
        }).catch(() => [])
      : [];

    const studentMap = new Map<string, typeof preloadedStudents[0]>();
    for (const st of preloadedStudents) {
      if (st.id) studentMap.set(st.id, st);
      if (st.qrCodeToken) studentMap.set(st.qrCodeToken.trim(), st);
      if (st.studentCode) studentMap.set(st.studentCode.trim(), st);
    }

    for (const mutation of mutations) {
      try {
        switch (mutation.type) {
          case 'RECORD_HOMEWORK_ONSITE': {
            const res = await handleHomeworkOnsiteMutation(
              mutation,
              user,
              this.prisma,
              sessionMap,
              studentMap,
              this.logger,
            );
            results.push(res);
            break;
          }

          case 'RECORD_ATTENDANCE': {
            const res = await handleAttendanceMutation(
              mutation,
              user,
              this.prisma,
              sessionMap,
              studentMap,
              recorderId,
            );
            results.push(res);
            break;
          }

          default: {
            this.logger.warn(`Unhandled mutation type: ${mutation.type} in mutation ${mutation.id}`);
            results.push({
              mutationId: mutation.id,
              status: 'FAILED',
              error: `Unhandled mutation type: ${mutation.type}`,
            });
            break;
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Mutation ${mutation.id} [${mutation.type}] failed: ${err.message}`,
          err.stack,
        );
        results.push({
          mutationId: mutation.id,
          status: 'FAILED',
          error: err.message || 'Error processing mutation',
        });
      }
    }

    const hasSuccessAttendanceOrHw = results.some((r) => r.status === 'SUCCESS');
    if (hasSuccessAttendanceOrHw) {
      this.realtimeGateway?.notifyAttendanceChanged([user.id]);
      this.realtimeGateway?.notifyHomeworkChanged([user.id]);
    }

    return results;
  }
}
