import { describe, it, expect } from 'vitest';
import {
  CONTAINS_DIGITS_REGEX,
  PERSON_NAME_REGEX,
  sanitizeNameInput,
  validatePersonName,
  isValidPersonName,
} from '../name-validator';

describe('Web Name Validator & Sanitizer', () => {
  describe('sanitizeNameInput', () => {
    it('strips western and arabic numbers in real-time', () => {
      expect(sanitizeNameInput('01012345678')).toBe('');
      expect(sanitizeNameInput('محمد 123 علي')).toBe('محمد  علي');
      expect(sanitizeNameInput('أحمد ٠١٠ علي')).toBe('أحمد  علي');
    });

    it('leaves clean names unchanged', () => {
      expect(sanitizeNameInput('محمود أحمد علي')).toBe('محمود أحمد علي');
      expect(sanitizeNameInput('Omar Mostafa')).toBe('Omar Mostafa');
    });
  });

  describe('CONTAINS_DIGITS_REGEX', () => {
    it('identifies numbers correctly', () => {
      expect(CONTAINS_DIGITS_REGEX.test('123456')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('01098765432')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('محمد 1')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('أحمد ٩')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('محمد أحمد')).toBe(false);
    });
  });

  describe('validatePersonName', () => {
    it('accepts valid Arabic and English names', () => {
      expect(validatePersonName('محمد أحمد علي').isValid).toBe(true);
      expect(validatePersonName('عبد الرحمن مصطفى').isValid).toBe(true);
      expect(validatePersonName('John Doe').isValid).toBe(true);
      expect(validatePersonName("Sarah O'Connor").isValid).toBe(true);
    });

    it('returns error when digits are present', () => {
      const res = validatePersonName('01012345678', { fieldName: 'اسم ولي الأمر' });
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('يجب أن يتكون من حروف فقط ولا يحتوي على أرقام');
    });

    it('returns error when symbols or emojis are present', () => {
      const res = validatePersonName('أحمد @ علي', { fieldName: 'اسم الطالب' });
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('غير صالح، يرجى كتابة أحرف فقط');
    });

    it('handles empty and short names', () => {
      expect(validatePersonName('', { fieldName: 'اسم ولي الأمر' }).errorMessage).toBe('يرجى إدخال اسم ولي الأمر');
      expect(validatePersonName('أ', { fieldName: 'اسم ولي الأمر', minLength: 3 }).errorMessage).toContain('يجب أن يتكون من 3 أحرف على الأقل');
    });

    it('handles optional field correctly when empty', () => {
      expect(validatePersonName('', { required: false }).isValid).toBe(true);
      expect(validatePersonName(undefined, { required: false }).isValid).toBe(true);
    });
  });
});
