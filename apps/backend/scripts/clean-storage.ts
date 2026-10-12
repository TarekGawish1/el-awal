import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StorageCleanupService } from '../src/integrations/storage/storage-cleanup.service';

async function bootstrap() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const graceArg = args.find((a) => a.startsWith('--grace='));
  const gracePeriodHours = graceArg ? parseFloat(graceArg.split('=')[1]) : 24;

  console.log(`\n🚀 Initializing Nest application context for Cloudflare R2 cleanup...`);
  console.log(`   Mode: ${dryRun ? 'DRY-RUN (No files will be deleted)' : 'LIVE DELETE'}`);
  console.log(`   Grace Period: ${gracePeriodHours} hours\n`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const cleanupService = app.get(StorageCleanupService);
    const report = await cleanupService.scanAndCleanOrphans({
      dryRun,
      gracePeriodHours,
    });

    console.log('\n==================================================');
    console.log('       CLOUDFLARE R2 ORPHAN CLEANUP REPORT        ');
    console.log('==================================================');
    console.log(`Total R2 Objects Scanned : ${report.totalR2Objects}`);
    console.log(`Total R2 Bucket Size    : ${(report.totalR2SizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Referenced Active Files  : ${report.referencedCount}`);
    console.log(`Recent Files (Protected) : ${report.recentProtectedCount}`);
    console.log(`Orphan Files Found       : ${report.orphanCount}`);
    console.log(`Orphan Files Deleted     : ${report.deletedCount}`);
    console.log(`Storage Space Freed      : ${(report.freedSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Scan Duration            : ${report.durationMs} ms`);
    console.log('==================================================\n');

    if (report.orphanKeys.length > 0) {
      console.log('Orphan Keys:');
      report.orphanKeys.forEach((k, idx) => console.log(`  ${idx + 1}. ${k}`));
      console.log('');
    }
  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
