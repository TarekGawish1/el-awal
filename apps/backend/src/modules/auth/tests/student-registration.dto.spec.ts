import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { RegisterStudentDto } from '../dto/student-registration.dto';

describe('RegisterStudentDto (server-side validation)', () => {
  // Mirrors the strict global ValidationPipe configuration in main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const valid = {
    fullName: 'محمود أحمد علي',
    studentPhone: '01012345678',
    parentPhone: '01098765432',
    academicStage: 'SECONDARY',
    gradeLevel: 'الصف الثالث الثانوي',
    attendanceMode: 'CENTER',
  };

  it('accepts a well-formed registration request', async () => {
    const result = await pipe.transform(valid, { type: 'body', metatype: RegisterStudentDto });
    expect(result.fullName).toBe('محمود أحمد علي');
  });

  it('rejects an empty or too-short full name', async () => {
    await expect(
      pipe.transform({ ...valid, fullName: '' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({ ...valid, fullName: 'أب' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an excessively long full name', async () => {
    await expect(
      pipe.transform({ ...valid, fullName: 'أ'.repeat(300) }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a missing or invalid student phone', async () => {
    await expect(
      pipe.transform({ ...valid, studentPhone: '' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({ ...valid, studentPhone: '12345' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a missing or invalid parent phone', async () => {
    await expect(
      pipe.transform({ ...valid, parentPhone: '' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({ ...valid, parentPhone: 'not-a-phone' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid academic stage', async () => {
    await expect(
      pipe.transform({ ...valid, academicStage: 'UNIVERSITY' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an empty or excessively long grade level', async () => {
    await expect(
      pipe.transform({ ...valid, gradeLevel: '' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({ ...valid, gradeLevel: 'ص'.repeat(60) }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects client-supplied role escalation (role = ADMIN)', async () => {
    await expect(
      pipe.transform({ ...valid, role: 'ADMIN' }, { type: 'body', metatype: RegisterStudentDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects client-supplied role escalation (role = SECRETARIAT / TEACHER / PARENT)', async () => {
    for (const role of ['SECRETARIAT', 'TEACHER', 'PARENT']) {
      await expect(
        pipe.transform({ ...valid, role }, { type: 'body', metatype: RegisterStudentDto }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('rejects attempts to inject internal identifiers (studentId / userId / parentId)', async () => {
    await expect(
      pipe.transform(
        { ...valid, studentId: 'victim-student-uuid', parentId: 'victim-parent-uuid' },
        { type: 'body', metatype: RegisterStudentDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
