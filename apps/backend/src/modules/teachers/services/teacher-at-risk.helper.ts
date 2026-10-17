import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

/**
 * Resolves at-risk students with consecutive absences across groups.
 */
export async function resolveAtRiskStudents(
  prisma: PrismaService,
  groupIds: string[],
): Promise<any[]> {
  const atRiskStudents: any[] = [];
  const candidateAbsences = await prisma.attendanceRecord.findMany({
    where: {
      session: { groupId: { in: groupIds } },
      status: AttendanceStatus.ABSENT,
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, phone: true } },
          parentLinks: {
            include: { parent: { include: { user: { select: { phone: true } } } } },
          },
        },
      },
      session: {
        include: { group: { select: { id: true, name: true } } },
      },
    },
    orderBy: { recordedAt: 'desc' },
    take: 30,
  });

  const candidateStudentIds = Array.from(new Set(candidateAbsences.map((a) => a.studentId)));
  const studentRecentHistory =
    candidateStudentIds.length > 0
      ? await prisma.attendanceRecord.findMany({
          where: {
            studentId: { in: candidateStudentIds },
            session: { groupId: { in: groupIds } },
          },
          select: {
            studentId: true,
            status: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: 'desc' },
        })
      : [];

  const historyByStudent = new Map<string, AttendanceStatus[]>();
  for (const h of studentRecentHistory) {
    if (!historyByStudent.has(h.studentId)) {
      historyByStudent.set(h.studentId, []);
    }
    historyByStudent.get(h.studentId)!.push(h.status);
  }

  const studentAbsenceMap = new Map<string, any>();
  for (const rec of candidateAbsences) {
    if (!studentAbsenceMap.has(rec.studentId)) {
      const statuses = historyByStudent.get(rec.studentId) || [];
      let consecutive = 0;
      for (const st of statuses) {
        if (st === AttendanceStatus.ABSENT) {
          consecutive += 1;
        } else {
          break;
        }
      }

      if (consecutive > 0) {
        studentAbsenceMap.set(rec.studentId, {
          id: rec.id,
          studentId: rec.studentId,
          studentName: rec.student.user.fullName,
          groupId: rec.session.group.id,
          groupName: rec.session.group.name,
          consecutiveAbsences: consecutive,
          lastAttendedDate: rec.recordedAt.toISOString().split('T')[0],
          parentPhone:
            (rec.student as any).emergencyPhone ||
            rec.student.parentLinks[0]?.parent.user.phone ||
            rec.student.user.phone,
        });
      }
    }
  }

  const sortedAtRisk = Array.from(studentAbsenceMap.values())
    .sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences)
    .slice(0, 5);
  atRiskStudents.push(...sortedAtRisk);

  return atRiskStudents;
}
