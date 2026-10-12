import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StorageService } from './storage.service';

export interface StorageCleanupOptions {
  dryRun?: boolean;
  gracePeriodHours?: number;
}

export interface StorageCleanupReport {
  dryRun: boolean;
  gracePeriodHours: number;
  totalR2Objects: number;
  totalR2SizeBytes: number;
  referencedCount: number;
  recentProtectedCount: number;
  orphanCount: number;
  deletedCount: number;
  freedSizeBytes: number;
  orphanKeys: string[];
  durationMs: number;
  timestamp: string;
}

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Scans all files in Cloudflare R2 bucket, compares them against all database models,
   * and purges any unlinked (orphaned) files older than the specified grace period.
   */
  async scanAndCleanOrphans(options?: StorageCleanupOptions): Promise<StorageCleanupReport> {
    const startTime = Date.now();
    const dryRun = options?.dryRun ?? false;
    const gracePeriodHours = options?.gracePeriodHours ?? 24;
    const cutoffTime = Date.now() - gracePeriodHours * 60 * 60 * 1000;

    this.logger.log(
      `🔍 [StorageCleanup] Starting Cloudflare R2 scan (dryRun=${dryRun}, gracePeriodHours=${gracePeriodHours})...`,
    );

    // 1. Gather all active file keys and filenames referenced across the database
    const { referencedKeys, referencedFilenames } = await this.getAllReferencedStorageKeys();
    this.logger.log(
      `📊 [StorageCleanup] Loaded ${referencedKeys.size} referenced keys and ${referencedFilenames.size} unique filenames from DB.`,
    );

    // 2. List all objects in Cloudflare R2 bucket
    const r2Objects = await this.storageService.listObjects('');
    const totalR2Objects = r2Objects.length;
    let totalR2SizeBytes = 0;
    let referencedCount = 0;
    let recentProtectedCount = 0;
    const orphanKeys: string[] = [];
    let freedSizeBytes = 0;

    for (const item of r2Objects) {
      totalR2SizeBytes += item.size;
      const cleanKey = item.key.replace(/^\/+/, '');
      const filename = cleanKey.split('/').pop() || cleanKey;
      const lastModifiedTime = item.lastModified ? item.lastModified.getTime() : Date.now();

      // Check if file is referenced anywhere in DB
      const isReferenced = referencedKeys.has(cleanKey) || referencedFilenames.has(filename);

      if (isReferenced) {
        referencedCount++;
        continue;
      }

      // Check grace period (never delete files created within the last N hours)
      if (lastModifiedTime > cutoffTime) {
        recentProtectedCount++;
        continue;
      }

      // Found unlinked orphan older than grace period
      orphanKeys.push(cleanKey);
      freedSizeBytes += item.size;
    }

    // 3. Purge orphaned objects if not in dry-run mode
    let deletedCount = 0;
    if (!dryRun && orphanKeys.length > 0) {
      this.logger.log(
        `🗑️ [StorageCleanup] Purging ${orphanKeys.length} orphaned files from Cloudflare R2...`,
      );
      deletedCount = await this.storageService.deleteObjects(orphanKeys);
    } else {
      deletedCount = dryRun ? 0 : orphanKeys.length;
    }

    const durationMs = Date.now() - startTime;
    const report: StorageCleanupReport = {
      dryRun,
      gracePeriodHours,
      totalR2Objects,
      totalR2SizeBytes,
      referencedCount,
      recentProtectedCount,
      orphanCount: orphanKeys.length,
      deletedCount,
      freedSizeBytes,
      orphanKeys,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    const freedMb = (freedSizeBytes / (1024 * 1024)).toFixed(2);
    this.logger.log(
      `✅ [StorageCleanup] Completed in ${durationMs}ms: found ${orphanKeys.length} orphans, freed ${freedMb} MB (deleted=${deletedCount}, dryRun=${dryRun}).`,
    );

    return report;
  }

  /**
   * Queries all tables across the PostgreSQL database that store Cloudflare R2 keys or URLs.
   */
  async getAllReferencedStorageKeys(): Promise<{
    referencedKeys: Set<string>;
    referencedFilenames: Set<string>;
  }> {
    const referencedKeys = new Set<string>();
    const referencedFilenames = new Set<string>();

    const addReference = (val: unknown) => {
      if (!val) return;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed.startsWith('data:')) return;

        // Try extracting URL pathname
        let key = trimmed;
        if (/^https?:\/\//i.test(trimmed)) {
          try {
            const parsed = new URL(trimmed);
            key = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
          } catch {
            key = trimmed;
          }
        } else {
          key = trimmed.replace(/^\/+/, '');
        }

        if (key) {
          referencedKeys.add(key);
          const fname = key.split('/').pop();
          if (fname && fname.length >= 6) {
            referencedFilenames.add(fname);
          }
        }

        // Also check if text contains embedded "uploads/..." path
        const matches = trimmed.match(/uploads\/[a-zA-Z0-9_\-\/.]+/g);
        if (matches) {
          for (const match of matches) {
            const cleanMatch = match.replace(/^\/+/, '');
            referencedKeys.add(cleanMatch);
            const mfname = cleanMatch.split('/').pop();
            if (mfname && mfname.length >= 6) {
              referencedFilenames.add(mfname);
            }
          }
        }
      } else if (Array.isArray(val)) {
        for (const item of val) {
          addReference(item);
        }
      } else if (typeof val === 'object') {
        try {
          const str = JSON.stringify(val);
          const matches = str.match(/(?:https?:\/\/[^\s"']+)|(?:uploads\/[a-zA-Z0-9_\-\/.]+)/g);
          if (matches) {
            for (const match of matches) {
              addReference(match);
            }
          }
        } catch {
          // ignore
        }
      }
    };

    try {
      const [
        courses,
        lessons,
        attachments,
        enrollments,
        contents,
        questions,
        submissions,
        certificates,
        siteSettings,
        systemSettings,
        studentAnswers,
      ] = await Promise.all([
        this.prisma.course.findMany({
          select: { coverImageUrl: true, previewVideoUrl: true },
        }),
        this.prisma.courseLesson.findMany({
          select: { contentUrl: true },
        }),
        this.prisma.lessonAttachment.findMany({
          select: { fileUrl: true, fileKey: true },
        }),
        this.prisma.courseEnrollment.findMany({
          select: { receiptImageUrl: true },
        }),
        this.prisma.educationalContent.findMany({
          select: { fileUrl: true, fileKey: true },
        }),
        this.prisma.assessmentQuestion.findMany({
          select: { imageUrl: true, optionImages: true },
        }),
        this.prisma.assessmentSubmission.findMany({
          select: { attachmentUrl: true, fileKey: true },
        }),
        this.prisma.certificate.findMany({
          select: { fileUrl: true },
        }),
        this.prisma.siteSetting.findMany({
          select: { value: true },
        }),
        this.prisma.systemSetting.findMany({
          select: { value: true },
        }),
        this.prisma.studentAnswer.findMany({
          where: { selectedAnswer: { contains: 'upload' } },
          select: { selectedAnswer: true },
        }),
      ]);

      // Courses
      for (const c of courses) {
        addReference(c.coverImageUrl);
        addReference(c.previewVideoUrl);
      }

      // Lessons
      for (const l of lessons) {
        addReference(l.contentUrl);
      }

      // Lesson Attachments
      for (const a of attachments) {
        addReference(a.fileUrl);
        addReference(a.fileKey);
      }

      // Course Enrollments (payment receipts)
      for (const e of enrollments) {
        addReference(e.receiptImageUrl);
      }

      // Educational Content Library
      for (const c of contents) {
        addReference(c.fileUrl);
        addReference(c.fileKey);
      }

      // Assessment Questions
      for (const q of questions) {
        addReference(q.imageUrl);
        addReference(q.optionImages);
      }

      // Assessment Submissions
      for (const s of submissions) {
        addReference(s.attachmentUrl);
        addReference(s.fileKey);
      }

      // Certificates
      for (const cert of certificates) {
        addReference(cert.fileUrl);
      }

      // Settings
      for (const ss of siteSettings) {
        addReference(ss.value);
      }
      for (const sys of systemSettings) {
        addReference(sys.value);
      }

      // Essay / student answers containing uploads
      for (const ans of studentAnswers) {
        addReference(ans.selectedAnswer);
      }
    } catch (error) {
      this.logger.error('Failed to query database for storage references:', error);
      throw error;
    }

    return { referencedKeys, referencedFilenames };
  }
}
