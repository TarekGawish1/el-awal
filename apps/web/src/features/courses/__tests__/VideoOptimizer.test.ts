import { describe, it, expect } from 'vitest';
import {
  validateVideoFile,
  formatVideoSize,
  formatDuration,
  formatEtaArabic,
  MAX_VIDEO_SIZE_BYTES,
} from '../utils/video-optimizer';

describe('Video Optimizer & 2GB Limit Engine', () => {
  it('enforces the exact 2 GB (2048 MB) maximum size limit', () => {
    const validSmallFile = new File(['small video content'], 'lesson.mp4', {
      type: 'video/mp4',
    });
    expect(validateVideoFile(validSmallFile).isValid).toBe(true);

    // 1.5 GB file
    const onePointFiveGbFile = {
      name: 'large_lesson.mp4',
      size: 1.5 * 1024 * 1024 * 1024,
      type: 'video/mp4',
    } as unknown as File;
    expect(validateVideoFile(onePointFiveGbFile).isValid).toBe(true);

    // Exactly 2 GB file
    const exactTwoGbFile = {
      name: 'exact_2gb.mp4',
      size: MAX_VIDEO_SIZE_BYTES,
      type: 'video/mp4',
    } as unknown as File;
    expect(validateVideoFile(exactTwoGbFile).isValid).toBe(true);

    // 2.1 GB file (Exceeds limit)
    const oversizedFile = {
      name: 'too_large.mp4',
      size: 2.1 * 1024 * 1024 * 1024,
      type: 'video/mp4',
    } as unknown as File;
    const result = validateVideoFile(oversizedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('يتجاوز الحد الأقصى');
    expect(result.error).toContain('2 جيجابايت');
  });

  it('validates supported video formats (MP4, MOV, MKV, WebM)', () => {
    const validMov = {
      name: 'lesson.mov',
      size: 500 * 1024 * 1024,
      type: 'video/quicktime',
    } as unknown as File;
    expect(validateVideoFile(validMov).isValid).toBe(true);

    const validMkv = {
      name: 'lesson.mkv',
      size: 700 * 1024 * 1024,
      type: 'video/x-matroska',
    } as unknown as File;
    expect(validateVideoFile(validMkv).isValid).toBe(true);

    const invalidPdf = {
      name: 'lesson.pdf',
      size: 10 * 1024 * 1024,
      type: 'application/pdf',
    } as unknown as File;
    const invalidResult = validateVideoFile(invalidPdf);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('نوع الملف غير مدعوم');
  });

  it('formats video sizes accurately into Arabic megabytes and gigabytes', () => {
    expect(formatVideoSize(100 * 1024 * 1024)).toBe('100.0 ميجابايت');
    expect(formatVideoSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 جيجابايت');
    expect(formatVideoSize(2 * 1024 * 1024 * 1024)).toBe('2.00 جيجابايت');
  });

  it('formats durations and remaining ETA correctly', () => {
    expect(formatDuration(1800)).toBe('30:00');
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatEtaArabic(45)).toBe('45 ثانية');
    expect(formatEtaArabic(125)).toBe('2 دقيقة و 5 ثانية');
  });
});
