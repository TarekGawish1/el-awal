import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

const VISIBLE_YEARS_KEY = 'certificates.visibleYears';

// Whitelist of setting keys manageable through the API.
// Unknown keys are rejected so random clients cannot pollute the store.
const MANAGEABLE_KEYS = [VISIBLE_YEARS_KEY];

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseYears(raw: string | null | undefined): string[] | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch (error) {
      this.logger.warn(`Could not parse site setting value: ${error}`);
    }
    return null;
  }

  /** Public landing-page settings (fail-open: null means "show all"). */
  async getPublicSettings() {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key: VISIBLE_YEARS_KEY },
    });
    return { certificatesVisibleYears: this.parseYears(row?.value) };
  }

  /** All manageable settings with parsed values (dashboard). */
  async getAllSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: MANAGEABLE_KEYS } },
      orderBy: { key: 'asc' },
    });
    return {
      settings: MANAGEABLE_KEYS.map((key) => {
        const row = rows.find((r) => r.key === key);
        return { key, value: this.parseYears(row?.value) ?? [] };
      }),
    };
  }

  async updateSetting(key: string, value: string[]) {
    if (!MANAGEABLE_KEYS.includes(key)) {
      throw new BadRequestException('إعداد غير مدعوم');
    }
    const clean = [...new Set(value.map((v) => String(v).trim()).filter(Boolean))].sort();
    const updated = await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(clean) },
      update: { value: JSON.stringify(clean) },
    });
    return { key: updated.key, value: this.parseYears(updated.value) ?? [] };
  }
}
