import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import {
  CONTAINS_DIGITS_REGEX,
  PERSON_NAME_REGEX,
  validatePersonName,
  isValidPersonName,
} from '../name.util';
import { IsPersonName } from '../../decorators/is-person-name.decorator';

class TestDto {
  @IsPersonName()
  name!: string;
}

class TestOptionalDto {
  @IsPersonName()
  parentName?: string;
}

describe('Person Name Validation & Anti-Digit Rules', () => {
  describe('CONTAINS_DIGITS_REGEX', () => {
    it('detects standard western digits (0-9)', () => {
      expect(CONTAINS_DIGITS_REGEX.test('01012345678')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('محمد 1')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('123')).toBe(true);
    });

    it('detects Arabic-Indic digits (٠-٩)', () => {
      expect(CONTAINS_DIGITS_REGEX.test('٠١٠١٢٣٤٥٦٧٨')).toBe(true);
      expect(CONTAINS_DIGITS_REGEX.test('أحمد ٢')).toBe(true);
    });

    it('returns false when no digits are present', () => {
      expect(CONTAINS_DIGITS_REGEX.test('محمود أحمد علي')).toBe(false);
      expect(CONTAINS_DIGITS_REGEX.test('Sarah Connor')).toBe(false);
    });
  });

  describe('PERSON_NAME_REGEX & validatePersonName', () => {
    it('accepts legitimate Arabic names with multiple parts and hamzas', () => {
      expect(isValidPersonName('محمد أحمد علي')).toBe(true);
      expect(isValidPersonName('عبد الرحمن مصطفى')).toBe(true);
      expect(isValidPersonName('آمال مصطفى حجاج')).toBe(true);
      expect(isValidPersonName('إبراهيم إسماعيل')).toBe(true);
    });

    it('accepts legitimate English / Latin names', () => {
      expect(isValidPersonName('John Smith')).toBe(true);
      expect(isValidPersonName('Anne-Marie')).toBe(true);
      expect(isValidPersonName("O'Connor")).toBe(true);
    });

    it('strictly rejects names with numbers', () => {
      const res1 = validatePersonName('01012345678');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toBe('CONTAINS_NUMBERS');

      const res2 = validatePersonName('محمد 123');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toBe('CONTAINS_NUMBERS');

      const res3 = validatePersonName('أحمد ٩');
      expect(res3.isValid).toBe(false);
      expect(res3.error).toBe('CONTAINS_NUMBERS');
    });

    it('rejects symbols, punctuation, and emojis', () => {
      expect(isValidPersonName('محمد @ أحمد')).toBe(false);
      expect(isValidPersonName('أحمد#2')).toBe(false);
      expect(isValidPersonName('علي_حسن')).toBe(false);
      expect(isValidPersonName('أحمد! ⭐')).toBe(false);
    });

    it('rejects empty or whitespace-only names', () => {
      expect(isValidPersonName('')).toBe(false);
      expect(isValidPersonName('   ')).toBe(false);
    });

    it('rejects names shorter than minLength', () => {
      expect(isValidPersonName('أ')).toBe(false);
      expect(isValidPersonName('ab', 3)).toBe(false);
    });
  });

  describe('@IsPersonName Decorator', () => {
    it('passes for valid person names', async () => {
      const dto = new TestDto();
      dto.name = 'محمود أحمد علي';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('fails when numbers are entered as the name', async () => {
      const dto = new TestDto();
      dto.name = '01012345678';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isPersonName).toContain('الاسم يجب ألا يحتوي على أي أرقام');
    });

    it('passes for optional undefined fields', async () => {
      const dto = new TestOptionalDto();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
