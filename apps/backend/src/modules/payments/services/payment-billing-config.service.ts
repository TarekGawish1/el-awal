import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { MatrixLedgerQueryDto } from '../dto/matrix-ledger-query.dto';

export const FIRST_TERM_MONTHS = [8, 9, 10, 11, 12, 1];
export const SECOND_TERM_MONTHS = [2, 3, 4, 5, 6, 7];

export const STAGE_GRADE_LEVELS: Record<string, string[]> = {
  PRIMARY: [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  PREPARATORY: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  SECONDARY: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
};

export const round2 = (value: number) => Math.round(value * 100) / 100;
export const rate = (collected: number, expected: number) =>
  expected > 0 ? Math.round((collected / expected) * 10000) / 100 : 0;

@Injectable()
export class PaymentBillingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  parsePeriod(query: MatrixLedgerQueryDto) {
    let academicYear = query.academicYear;
    let academicTerm = query.academicTerm;

    if (query.academicPeriodId) {
      const match = query.academicPeriodId.match(/^(\d{4}-\d{4})[:|_-](FIRST_TERM|SECOND_TERM)$/);
      if (match) {
        academicYear = academicYear || match[1];
        academicTerm = academicTerm || match[2];
      }
    }

    academicYear = academicYear || '2026-2027';
    academicTerm = academicTerm || 'FIRST_TERM';

    const startYear = Number(academicYear.split('-')[0]);
    const availableMonths = academicTerm === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const paymentYearForMonth = (month: number) =>
      academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;

    return { academicYear, academicTerm, availableMonths, paymentYearForMonth };
  }

  async resolveTeacherId(user: AuthenticatedUser) {
    if (user.role === UserRole.TEACHER) {
      if (user.teacherProfileId) return user.teacherProfileId;
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { OR: [{ id: user.id }, { user: { id: user.id } }] },
        select: { id: true },
      });
      return teacher?.id || user.id;
    }
    if (user.role === UserRole.SECRETARIAT) {
      if (user.teacherProfileId) return user.teacherProfileId;
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: user.id, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      return link?.teacherId || null;
    }
    return null;
  }

  parseBillingConfig(value: unknown, availableMonths: number[]) {
    if (!value) {
      return { excludedMonths: [] as number[], paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
    }
    if (Array.isArray(value)) {
      const excludedMonths = value.map((m) => Number(m)).filter((m) => availableMonths.includes(m));
      return { excludedMonths, paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as any;
      const rawMonths = Array.isArray(obj.excludedMonths)
        ? obj.excludedMonths
        : Array.isArray(obj.months)
        ? obj.months
        : [];
      const excludedMonths = rawMonths.map((m: any) => Number(m)).filter((m: number) => availableMonths.includes(m));
      const paymentTiming = obj.paymentTiming === 'POSTPAID' ? 'POSTPAID' : 'PREPAID';
      return { excludedMonths, paymentTiming: paymentTiming as 'PREPAID' | 'POSTPAID' };
    }
    return { excludedMonths: [] as number[], paymentTiming: 'PREPAID' as 'PREPAID' | 'POSTPAID' };
  }

  normalizeExcludedMonths(value: unknown, availableMonths: number[]) {
    return this.parseBillingConfig(value, availableMonths).excludedMonths;
  }

  isMonthStarted(
    academicYear: string,
    academicTerm: string,
    month: number,
    paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID',
  ) {
    const startYear = Number(academicYear.split('-')[0]);
    const actualYear = academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    if (paymentTiming === 'POSTPAID') {
      return actualYear < currentYear || (actualYear === currentYear && month < currentMonth);
    }

    return actualYear < currentYear || (actualYear === currentYear && month <= currentMonth);
  }

  inferStage(gradeLevel: string): string {
    return Object.entries(STAGE_GRADE_LEVELS).find(([, grades]) => grades.includes(gradeLevel))?.[0] || '';
  }

  async getBillingConfiguration(user: AuthenticatedUser, academicYear?: string, academicTerm?: string) {
    const teacherId = await this.resolveTeacherId(user);
    const year = academicYear || '2026-2027';
    const term = academicTerm === 'SECOND_TERM' ? 'SECOND_TERM' : 'FIRST_TERM';
    const availableMonths = term === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const configuration = teacherId
      ? await this.prisma.teacherBillingConfiguration.findUnique({
          where: { teacherId_academicYear_academicTerm: { teacherId, academicYear: year, academicTerm: term } },
        })
      : null;

    const parsed = this.parseBillingConfig(configuration?.excludedMonths, availableMonths);

    return {
      academicYear: year,
      academicTerm: term,
      availableMonths,
      excludedMonths: parsed.excludedMonths,
      paymentTiming: parsed.paymentTiming,
    };
  }

  async updateBillingConfiguration(
    user: AuthenticatedUser,
    dto: { academicYear: string; academicTerm: string; excludedMonths: number[]; paymentTiming?: 'PREPAID' | 'POSTPAID' },
  ) {
    const teacherId = await this.resolveTeacherId(user);
    if (!teacherId) throw new ForbiddenException('A teacher profile is required to save billing configuration');

    const availableMonths = dto.academicTerm === 'SECOND_TERM' ? SECOND_TERM_MONTHS : FIRST_TERM_MONTHS;
    const { excludedMonths, paymentTiming } = this.parseBillingConfig(
      { excludedMonths: dto.excludedMonths, paymentTiming: dto.paymentTiming },
      availableMonths,
    );
    const configurationPayload = {
      excludedMonths,
      paymentTiming,
    };

    const configuration = await this.prisma.teacherBillingConfiguration.upsert({
      where: { teacherId_academicYear_academicTerm: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm } },
      create: { teacherId, academicYear: dto.academicYear, academicTerm: dto.academicTerm, excludedMonths: configurationPayload },
      update: { excludedMonths: configurationPayload },
    });

    return {
      academicYear: configuration.academicYear,
      academicTerm: configuration.academicTerm,
      availableMonths,
      excludedMonths,
      paymentTiming,
    };
  }
}
