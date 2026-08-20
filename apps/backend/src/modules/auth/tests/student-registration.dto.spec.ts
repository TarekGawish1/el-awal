import { ValidationPipe, BadRequestException } from '@nestjs/common';
import {
  VerifyStudentRegistrationDto,
  RegisterStudentAccountDto,
} from '../dto/student-registration.dto';

describe('Student Registration DTOs (server-side validation)', () => {
  // Mirrors the strict global ValidationPipe configuration in main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  describe('VerifyStudentRegistrationDto', () => {
    it('accepts a well-formed verification request', async () => {
      const result = await pipe.transform(
        { studentCode: 'STU-2026-0001', registrationCode: 'A7K2-9M4P-QX' },
        { type: 'body', metatype: VerifyStudentRegistrationDto },
      );
      expect(result.studentCode).toBe('STU-2026-0001');
    });

    it('rejects empty fields', async () => {
      await expect(
        pipe.transform({ studentCode: '', registrationCode: '' }, { type: 'body', metatype: VerifyStudentRegistrationDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects malformed student codes', async () => {
      await expect(
        pipe.transform(
          { studentCode: 'INVALID CODE WITH SPACES AND SYMBOLS $$$', registrationCode: 'A7K2-9M4P-QX' },
          { type: 'body', metatype: VerifyStudentRegistrationDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects excessively long activation codes', async () => {
      await expect(
        pipe.transform(
          { studentCode: 'STU-2026-0001', registrationCode: 'A'.repeat(40) },
          { type: 'body', metatype: VerifyStudentRegistrationDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('strips/rejects unknown properties', async () => {
      await expect(
        pipe.transform(
          { studentCode: 'STU-2026-0001', registrationCode: 'A7K2-9M4P-QX', role: 'ADMIN' },
          { type: 'body', metatype: VerifyStudentRegistrationDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RegisterStudentAccountDto', () => {
    const valid = {
      registrationToken: 'some.jwt.token',
      phone: '01012345678',
      email: 'student@elawal.com',
      password: 'Password123!',
    };

    it('accepts a well-formed account creation request', async () => {
      const result = await pipe.transform(valid, { type: 'body', metatype: RegisterStudentAccountDto });
      expect(result.password).toBe('Password123!');
    });

    it('rejects a too-short password', async () => {
      await expect(
        pipe.transform({ ...valid, password: '123' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty password', async () => {
      await expect(
        pipe.transform({ ...valid, password: '' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an excessively long password (bcrypt input limit)', async () => {
      await expect(
        pipe.transform({ ...valid, password: 'x'.repeat(100) }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid email format', async () => {
      await expect(
        pipe.transform({ ...valid, email: 'not-an-email' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-Egyptian phone number', async () => {
      await expect(
        pipe.transform({ ...valid, phone: '12345' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects client-supplied role escalation (role = ADMIN)', async () => {
      await expect(
        pipe.transform({ ...valid, role: 'ADMIN' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects client-supplied role escalation (role = SECRETARIAT)', async () => {
      await expect(
        pipe.transform({ ...valid, role: 'SECRETARIAT' }, { type: 'body', metatype: RegisterStudentAccountDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects attempts to overwrite the linked student identity (studentId / fullName)', async () => {
      await expect(
        pipe.transform(
          { ...valid, studentId: 'another-student-uuid', fullName: 'اسم مزور' },
          { type: 'body', metatype: RegisterStudentAccountDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a missing registration token', async () => {
      await expect(
        pipe.transform(
          { phone: valid.phone, password: valid.password },
          { type: 'body', metatype: RegisterStudentAccountDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
