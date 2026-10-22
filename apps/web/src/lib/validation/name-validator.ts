/**
 * Name Validation and Digit-Stripping Utilities for Student & Parent Names.
 */

/**
 * Regex matching any Western, Arabic-Indic, or Persian digits.
 */
export const CONTAINS_DIGITS_REGEX = /[0-9\u0660-\u0669\u06F0-\u06F9]/;

/**
 * Strict regex for valid person names:
 * Accepts Arabic characters (including hamzas, diacritics, and tatweel) and Latin letters,
 * separated by spaces, hyphens, or apostrophes.
 * Rejects all digits, symbols, emojis, and punctuation.
 */
export const PERSON_NAME_REGEX =
  /^[\u0621-\u064A\u0640-\u0652\u0671-\u06D3a-zA-Z]+(?:[\s'-]+[\u0621-\u064A\u0640-\u0652\u0671-\u06D3a-zA-Z]+)*$/;

/**
 * Strips all digits from a name input string in real time to prevent typing or pasting numbers.
 */
export function sanitizeNameInput(value: string): string {
  if (!value) return '';
  return value.replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, '');
}

export interface NameValidationOptions {
  minLength?: number;
  maxLength?: number;
  fieldName?: string; // e.g. 'اسم ولي الأمر' or 'اسم الطالب'
  required?: boolean;
}

export function validatePersonName(
  name: string | null | undefined,
  options: NameValidationOptions = {},
): { isValid: boolean; errorMessage?: string } {
  const {
    minLength = 3,
    maxLength = 200,
    fieldName = 'الاسم',
    required = true,
  } = options;

  if (!name || !name.trim()) {
    if (!required) return { isValid: true };
    return {
      isValid: false,
      errorMessage: `يرجى إدخال ${fieldName}`,
    };
  }

  const trimmed = name.trim();

  if (CONTAINS_DIGITS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: `${fieldName} غير صحيح، يجب أن يتكون من حروف فقط ولا يحتوي على أرقام`,
    };
  }

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      errorMessage: `${fieldName} يجب أن يتكون من ${minLength} أحرف على الأقل`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      errorMessage: `${fieldName} يجب ألا يتجاوز ${maxLength} حرفاً`,
    };
  }

  if (!PERSON_NAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: `${fieldName} غير صالح، يرجى كتابة أحرف فقط باللغة العربية أو الإنجليزية بدون رموز`,
    };
  }

  return { isValid: true };
}

export function isValidPersonName(
  name: string | null | undefined,
  minLength = 3,
): boolean {
  return validatePersonName(name, { minLength }).isValid;
}
