import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StudentQueryDto } from '../dto/student-query.dto';

describe('StudentQueryDto (isolated validation)', () => {
  // Mirrors the strict global ValidationPipe configuration in main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  describe('ValidationPipe integration (HTTP 400 rejection)', () => {
    it('accepts a valid UUID for groupId', async () => {
      const validUuid = 'c3d80bf2-7ad2-43bb-a4e7-49e0c52efb45';
      const result = await pipe.transform(
        { groupId: validUuid },
        { type: 'query', metatype: StudentQueryDto },
      );
      expect(result).toBeInstanceOf(StudentQueryDto);
      expect(result.groupId).toBe(validUuid);
    });

    it('accepts the reserved UNASSIGNED literal for groupId', async () => {
      const result = await pipe.transform(
        { groupId: 'UNASSIGNED' },
        { type: 'query', metatype: StudentQueryDto },
      );
      expect(result).toBeInstanceOf(StudentQueryDto);
      expect(result.groupId).toBe('UNASSIGNED');
    });

    it('rejects random arbitrary string with 400 Bad Request', async () => {
      await expect(
        pipe.transform(
          { groupId: 'random-invalid-group-string' },
          { type: 'query', metatype: StudentQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty string with 400 Bad Request', async () => {
      await expect(
        pipe.transform(
          { groupId: '' },
          { type: 'query', metatype: StudentQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a UUID-like string with an invalid version (e.g. version 0)', async () => {
      await expect(
        pipe.transform(
          { groupId: 'c3d80bf2-7ad2-03bb-a4e7-49e0c52efb45' },
          { type: 'query', metatype: StudentQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a UUID-like string with an invalid variant (e.g. variant 0)', async () => {
      await expect(
        pipe.transform(
          { groupId: 'c3d80bf2-7ad2-43bb-04e7-49e0c52efb45' },
          { type: 'query', metatype: StudentQueryDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts empty/omitted query when groupId is not provided', async () => {
      const result = await pipe.transform(
        {},
        { type: 'query', metatype: StudentQueryDto },
      );
      expect(result).toBeInstanceOf(StudentQueryDto);
      expect(result.groupId).toBeUndefined();
    });

    it('accepts valid combination of search, pagination, and UNASSIGNED groupId', async () => {
      const result = await pipe.transform(
        {
          search: 'أحمد',
          gradeLevel: 'الصف الأول الثانوي',
          academicStage: 'المرحلة الثانوية',
          groupId: 'UNASSIGNED',
          limit: 10,
        },
        { type: 'query', metatype: StudentQueryDto },
      );
      expect(result.search).toBe('أحمد');
      expect(result.groupId).toBe('UNASSIGNED');
      expect(result.limit).toBe(10);
    });
  });

  describe('Isolated class-validator unit checks', () => {
    it('returns zero validation errors for standard UUIDv4', async () => {
      const dto = plainToInstance(StudentQueryDto, {
        groupId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(0);
    });

    it('returns zero validation errors for standard UUIDv7', async () => {
      const dto = plainToInstance(StudentQueryDto, {
        groupId: '018e3c10-8b1a-7b3b-8fa4-123456789abc',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(0);
    });

    it('returns zero validation errors for UNASSIGNED', async () => {
      const dto = plainToInstance(StudentQueryDto, {
        groupId: 'UNASSIGNED',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(0);
    });

    it('flags validation error for random non-UUID string', async () => {
      const dto = plainToInstance(StudentQueryDto, {
        groupId: 'not-a-uuid-or-unassigned',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('groupId');
      expect(errors[0].constraints?.isUUIDOrUnassigned).toBe(
        'groupId must be a valid UUID or UNASSIGNED',
      );
    });

    it('flags validation error for UUID-like string with invalid version or variant', async () => {
      const invalidVersionDto = plainToInstance(StudentQueryDto, {
        groupId: 'c3d80bf2-7ad2-03bb-a4e7-49e0c52efb45',
      });
      const errorsVersion = await validate(invalidVersionDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errorsVersion).toHaveLength(1);
      expect(errorsVersion[0].property).toBe('groupId');
      expect(errorsVersion[0].constraints?.isUUIDOrUnassigned).toBe(
        'groupId must be a valid UUID or UNASSIGNED',
      );

      const invalidVariantDto = plainToInstance(StudentQueryDto, {
        groupId: 'c3d80bf2-7ad2-43bb-04e7-49e0c52efb45',
      });
      const errorsVariant = await validate(invalidVariantDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errorsVariant).toHaveLength(1);
      expect(errorsVariant[0].property).toBe('groupId');
    });

    it('flags validation error for empty string', async () => {
      const dto = plainToInstance(StudentQueryDto, {
        groupId: '',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('groupId');
    });

    it('returns zero validation errors when groupId is undefined', async () => {
      const dto = plainToInstance(StudentQueryDto, {});
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(0);
    });
  });
});
