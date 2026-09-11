import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";

const VISIBLE_YEARS_KEY = "certificates.visibleYears";
const VISIBLE_STAGES_KEY = "certificates.visibleStages";
const VISIBLE_GRADES_KEY = "certificates.visibleGrades";
const VISIBLE_GROUPS_KEY = "certificates.visibleGroups";

// Whitelist of setting keys manageable through the API.
// Unknown keys are rejected so random clients cannot pollute the store.
const MANAGEABLE_KEYS = [
  VISIBLE_YEARS_KEY,
  VISIBLE_STAGES_KEY,
  VISIBLE_GRADES_KEY,
  VISIBLE_GROUPS_KEY,
];

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseYears(raw: string | null | undefined): string[] | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch (error) {
      this.logger.warn(`Could not parse site setting value: ${error}`);
    }
    return null;
  }

  /** Public landing-page settings (fail-open: null means "show all"). */
  async getPublicSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: MANAGEABLE_KEYS } },
    });
    const valueFor = (key: string) =>
      this.parseYears(rows.find((row) => row.key === key)?.value);
    return {
      certificatesVisibleYears: valueFor(VISIBLE_YEARS_KEY),
      certificatesVisibleStages: valueFor(VISIBLE_STAGES_KEY),
      certificatesVisibleGrades: valueFor(VISIBLE_GRADES_KEY),
      certificatesVisibleGroups: valueFor(VISIBLE_GROUPS_KEY),
    };
  }

  /** All manageable settings with parsed values (dashboard). */
  async getAllSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: MANAGEABLE_KEYS } },
      orderBy: { key: "asc" },
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
      throw new BadRequestException("إعداد غير مدعوم");
    }
    const clean = [
      ...new Set(value.map((v) => String(v).trim()).filter(Boolean)),
    ].sort();
    const updated = await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(clean) },
      update: { value: JSON.stringify(clean) },
    });
    return { key: updated.key, value: this.parseYears(updated.value) ?? [] };
  }
}
