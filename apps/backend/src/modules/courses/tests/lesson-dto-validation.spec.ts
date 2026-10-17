import { ValidationPipe, ArgumentMetadata } from '@nestjs/common';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';

describe('Lesson DTO ValidationPipe Tests', () => {
  let targetPipe: ValidationPipe;

  beforeEach(() => {
    targetPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('CreateLessonDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateLessonDto,
    };

    it('should successfully validate payload containing quizId, homeworkId, and policy fields without throwing 400', async () => {
      const payload = {
        title: 'الدرس الأول: همزة القطع وألف الوصل',
        description: 'شرح تفصيلي للموضوع',
        summary: '### ملخص الدرس',
        lessonType: 'VIDEO',
        bunnyVideoId: '8f7a6b5c-4d3e-2f1a-0b9c-8e7d6c5b4a3f',
        videoDurationSeconds: 1800,
        isPreview: false,
        quizId: 'd933cc98-532e-4940-a1b6-ba121ff5a697',
        homeworkId: 'e822bb87-421d-4830-90a5-ab010ee4a586',
        allowMultipleAttempts: true,
        allowHomeworkMultipleAttempts: false,
        requirePassingScore: true,
        isQuizOptional: false,
        isQuizPassRequired: true,
        isHomeworkOptional: true,
        isHomeworkPassRequired: false,
      };

      const result = await targetPipe.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.quizId).toBe('d933cc98-532e-4940-a1b6-ba121ff5a697');
      expect(result.homeworkId).toBe('e822bb87-421d-4830-90a5-ab010ee4a586');
      expect(result.allowMultipleAttempts).toBe(true);
      expect(result.isQuizPassRequired).toBe(true);
    });

    it('should successfully validate payload when quizId and homeworkId are null', async () => {
      const payload = {
        title: 'الدرس بدون اختبارات',
        quizId: null,
        homeworkId: null,
      };

      const result = await targetPipe.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.quizId).toBeNull();
      expect(result.homeworkId).toBeNull();
    });

    it('should successfully validate payload when quizId and homeworkId are omitted', async () => {
      const payload = {
        title: 'الدرس بدون حقول إضافية',
      };

      const result = await targetPipe.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.quizId).toBeUndefined();
      expect(result.homeworkId).toBeUndefined();
    });

    it('should reject unknown/non-whitelisted properties with 400 Bad Request', async () => {
      const payload = {
        title: 'الدرس الأول',
        someCompletelyUnknownField: 'malicious or unexpected',
      };
      try {
        await targetPipe.transform(payload, metadata);
        fail('Should have thrown BadRequestException');
      } catch (err: any) {
        expect(err.getStatus()).toBe(400);
        const res = err.getResponse();
        expect(res.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('property someCompletelyUnknownField should not exist'),
          ]),
        );
      }
    });
  });

  describe('UpdateLessonDto', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateLessonDto,
    };

    it('should successfully validate update payload with quizId and homeworkId', async () => {
      const payload = {
        title: 'تعديل عنوان الدرس',
        quizId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        homeworkId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        isHomeworkOptional: true,
      };

      const result = await targetPipe.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.quizId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(result.homeworkId).toBe('b2c3d4e5-f6a7-8901-bcde-f12345678901');
      expect(result.isHomeworkOptional).toBe(true);
    });

    it('should successfully validate update payload with quizId: null to unlink', async () => {
      const payload = {
        quizId: null,
        homeworkId: null,
      };

      const result = await targetPipe.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.quizId).toBeNull();
      expect(result.homeworkId).toBeNull();
    });
  });
});
