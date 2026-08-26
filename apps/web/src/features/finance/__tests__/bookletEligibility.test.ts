import { describe, expect, it } from 'vitest';
import {
  formatBookletMismatchError,
  isBookletEligibleForStudent,
} from '../utils/bookletEligibility';

describe('booklet eligibility', () => {
  it('requires a matching known grade and membership for a scoped booklet', () => {
    const booklet = { gradeLevel: 'G1', groupId: 'group-1' };

    expect(isBookletEligibleForStudent(booklet, { gradeLevel: 'G1', groupIds: ['group-1'] })).toBe(true);
    expect(isBookletEligibleForStudent(booklet, { gradeLevel: 'G1', groupIds: ['group-2'] })).toBe(false);
    expect(isBookletEligibleForStudent(booklet, { gradeLevel: 'G2', groupIds: ['group-1'] })).toBe(false);
    expect(isBookletEligibleForStudent(booklet, { groupIds: ['group-1'] })).toBe(false);
  });

  it('formats backend booklet mismatch errors as Arabic feedback', () => {
    expect(
      formatBookletMismatchError('INVALID_BOOKLET_FOR_STUDENT: invalid booklet (G1 != G2)'),
    ).toBe('هذه المذكرة مخصصة لطلاب G1، بينما الطالب في G2. يرجى اختيار مذكرة متوافقة.');
  });
});
