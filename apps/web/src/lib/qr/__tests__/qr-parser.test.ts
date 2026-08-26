import { describe, it, expect } from 'vitest';
import { parseStudentQr, QR_ERROR_MESSAGES } from '../qr-parser';

describe('parseStudentQr', () => {
  describe('JSON Format Validation', () => {
    it('successfully parses valid STUDENT_QR JSON payload with full properties', () => {
      const payload = JSON.stringify({
        type: 'STUDENT_QR',
        studentId: 'stu-uuid-1234',
        code: 'STU-2026-0001',
        token: 'qr_tok_secret_token_123',
      });

      const result = parseStudentQr(payload);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('STUDENT_QR');
      expect(result.studentId).toBe('stu-uuid-1234');
      expect(result.studentCode).toBe('STU-2026-0001');
      expect(result.token).toBe('qr_tok_secret_token_123');
    });

    it('successfully parses valid STUDENT_QR JSON payload with alternative property names', () => {
      const payload = JSON.stringify({
        type: 'STUDENT_QR',
        id: 'stu-uuid-5678',
        studentCode: 'STU-2026-0042',
        qrCodeToken: 'QR-OFFLINE-0042',
      });

      const result = parseStudentQr(payload);
      expect(result.isValid).toBe(true);
      expect(result.studentId).toBe('stu-uuid-5678');
      expect(result.studentCode).toBe('STU-2026-0042');
      expect(result.token).toBe('QR-OFFLINE-0042');
    });

    it('rejects JSON payloads with incorrect or missing type', () => {
      const payload = JSON.stringify({
        type: 'PRODUCT_BARCODE',
        id: 'item-123',
        price: 50,
      });

      const result = parseStudentQr(payload);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_QR_CODE');
      expect(result.errorMessage).toBe(QR_ERROR_MESSAGES.INVALID_QR_CODE);
    });

    it('rejects empty or arbitrary JSON objects', () => {
      const result = parseStudentQr(JSON.stringify({ name: 'Random Object' }));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_QR_CODE');
    });
  });

  describe('Signed Payload String Validation', () => {
    it('successfully parses signed string in format ELAWAL:STU:<studentId>:<token>', () => {
      const result = parseStudentQr('ELAWAL:STU:stu-9988:token-abc-xyz');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('STUDENT_QR');
      expect(result.studentId).toBe('stu-9988');
      expect(result.token).toBe('token-abc-xyz');
    });

    it('successfully parses signed string with STUDENT keyword', () => {
      const result = parseStudentQr('ELAWAL:STUDENT:stu-7744:qr_tok_live_7744');
      expect(result.isValid).toBe(true);
      expect(result.studentId).toBe('stu-7744');
      expect(result.token).toBe('qr_tok_live_7744');
    });

    it('rejects malformed ELAWAL prefixes without student identifier', () => {
      const result = parseStudentQr('ELAWAL:STU:');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_QR_CODE');
    });
  });

  describe('Platform Token & Prefix Validation', () => {
    it('recognizes backend qr_tok_ tokens', () => {
      const result = parseStudentQr('qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('STUDENT_QR');
      expect(result.token).toBe('qr_tok_9f8a7b6c5d4e3f2a1b0c9e8d7c6b5a4f');
    });

    it('recognizes QR- prefixed tokens', () => {
      const result1 = parseStudentQr('QR-STU-2026-0042');
      expect(result1.isValid).toBe(true);
      expect(result1.token).toBe('QR-STU-2026-0042');

      const result2 = parseStudentQr('QR-OFFLINE-0041');
      expect(result2.isValid).toBe(true);

      const result3 = parseStudentQr('qr-student-101');
      expect(result3.isValid).toBe(true);
    });

    it('recognizes STU- prefixed student codes', () => {
      const result = parseStudentQr('STU-2026-1002');
      expect(result.isValid).toBe(true);
      expect(result.studentCode).toBe('STU-2026-1002');
    });
  });

  describe('Arbitrary & Non-System Input Rejection', () => {
    it('rejects URLs and website links', () => {
      expect(parseStudentQr('https://google.com').isValid).toBe(false);
      expect(parseStudentQr('http://example.com/student/123').isValid).toBe(false);
      expect(parseStudentQr('www.elawal-platform.com').isValid).toBe(false);
    });

    it('rejects hardware barcodes and serial numbers', () => {
      const result = parseStudentQr('LENOVO-SN-12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_QR_CODE');
      expect(result.errorMessage).toBe(QR_ERROR_MESSAGES.INVALID_QR_CODE);
    });

    it('rejects random strings and numbers', () => {
      expect(parseStudentQr('random-text-barcode').isValid).toBe(false);
      expect(parseStudentQr('1234567890123').isValid).toBe(false);
      expect(parseStudentQr('ISBN 978-0-123456-47-2').isValid).toBe(false);
    });

    it('rejects empty, null, or undefined values', () => {
      expect(parseStudentQr('').isValid).toBe(false);
      expect(parseStudentQr('   ').isValid).toBe(false);
      expect(parseStudentQr(null).isValid).toBe(false);
      expect(parseStudentQr(undefined).isValid).toBe(false);
    });
  });
});
