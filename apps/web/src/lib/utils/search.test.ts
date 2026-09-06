import { describe, it, expect } from 'vitest';
import { normalizeForSearch, matchesSearch } from './search';

describe('normalizeForSearch & matchesSearch', () => {
  it('normalizes Arabic Alef variants (أ, إ, آ, ٱ) to standard Alif (ا)', () => {
    expect(normalizeForSearch('أحمد')).toBe('احمد');
    expect(normalizeForSearch('إسلام')).toBe('اسلام');
    expect(normalizeForSearch('آدم')).toBe('ادم');
    expect(normalizeForSearch('ٱبن')).toBe('ابن');
  });

  it('normalizes names starting with i / I to start with ا', () => {
    expect(normalizeForSearch('Islam')).toBe('اslam');
    expect(normalizeForSearch('ibrahim')).toBe('اbrahim');
    expect(normalizeForSearch('i')).toBe('ا');
  });

  it('equates names starting with ا and i in matchesSearch', () => {
    // Searching with 'ا' matches names starting with 'أ', 'إ', 'آ', and 'i'
    expect(matchesSearch('أحمد غريب', 'ا')).toBe(true);
    expect(matchesSearch('إسلام محمد', 'ا')).toBe(true);
    expect(matchesSearch('ابراهيم عادل', 'ا')).toBe(true);
    expect(matchesSearch('Islam Adel', 'ا')).toBe(true);
    expect(matchesSearch('Ibrahim Nour', 'ا')).toBe(true);

    // Searching with 'i' matches names starting with 'أ', 'إ', 'آ', 'ا', and 'i'
    expect(matchesSearch('أحمد غريب', 'i')).toBe(true);
    expect(matchesSearch('إسلام محمد', 'i')).toBe(true);
    expect(matchesSearch('ابراهيم عادل', 'i')).toBe(true);
    expect(matchesSearch('Islam Adel', 'i')).toBe(true);
    expect(matchesSearch('Ibrahim Nour', 'i')).toBe(true);

    // Searching with 'أ' or 'إ' matches both
    expect(matchesSearch('أحمد غريب', 'أحمد')).toBe(true);
    expect(matchesSearch('احمد غريب', 'أحمد')).toBe(true);
    expect(matchesSearch('إسلام محمد', 'اسلام')).toBe(true);
    expect(matchesSearch('اسلام محمد', 'إسلام')).toBe(true);
  });

  it('normalizes Teh Marbuta and Heh, and Alef Maksura and Yeh', () => {
    expect(matchesSearch('مجموعة الأوائل', 'مجموعه')).toBe(true);
    expect(matchesSearch('مجموعه النخبه', 'مجموعة')).toBe(true);
    expect(matchesSearch('على حسن', 'علي')).toBe(true);
    expect(matchesSearch('علي حسن', 'على')).toBe(true);
  });

  it('ignores Arabic diacritics and tatweel', () => {
    expect(matchesSearch('مُحَمَّد', 'محمد')).toBe(true);
    expect(matchesSearch('مـحـمـد', 'محمد')).toBe(true);
  });

  it('handles multi-word search tokens', () => {
    expect(matchesSearch('مجموعة الإثنين و الخميس الصف الثالث', 'الإثنين الثالث')).toBe(true);
    expect(matchesSearch('كورس الكيمياء المكثف الأول الثانوي', 'كيمياء ثانوي')).toBe(true);
  });
});
