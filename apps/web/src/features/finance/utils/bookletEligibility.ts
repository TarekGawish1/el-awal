type StudentBookletContext = {
  gradeLevel?: string | null;
  groupIds?: string[] | null;
};

type BookletScope = {
  gradeLevel?: string | null;
  groupId?: string | null;
};

const cleanValue = (value?: string | null) => value?.trim() || undefined;

/**
 * A booklet always belongs to one grade. A group-scoped booklet additionally
 * requires a known membership in that group; unknown student data is not a pass.
 */
export function isBookletEligibleForStudent(
  booklet: BookletScope,
  student: StudentBookletContext,
): boolean {
  const studentGrade = cleanValue(student.gradeLevel);
  const bookletGrade = cleanValue(booklet.gradeLevel);

  if (!studentGrade || !bookletGrade || studentGrade !== bookletGrade) {
    return false;
  }

  const bookletGroupId = cleanValue(booklet.groupId);
  if (!bookletGroupId) {
    return true;
  }

  return (student.groupIds || []).includes(bookletGroupId);
}

export function formatBookletMismatchMessage(
  bookletGrade?: string | null,
  studentGrade?: string | null,
): string {
  const expectedGrade = cleanValue(bookletGrade);
  const actualGrade = cleanValue(studentGrade);

  if (expectedGrade && actualGrade) {
    return `هذه المذكرة مخصصة لطلاب ${expectedGrade}، بينما الطالب في ${actualGrade}. يرجى اختيار مذكرة متوافقة.`;
  }

  return 'هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب. يرجى اختيار مذكرة متوافقة.';
}

/** Converts the API validation error into a user-facing Arabic message. */
export function formatBookletMismatchError(message: unknown): string | undefined {
  const rawMessage = Array.isArray(message) ? message[0] : message;
  if (typeof rawMessage !== 'string' || !/INVALID_BOOKLET_FOR_STUDENT/i.test(rawMessage)) {
    return undefined;
  }

  const grades = rawMessage.match(/\(([^()]+?)\s*!=\s*([^()]+?)\)/);
  return formatBookletMismatchMessage(grades?.[1], grades?.[2]);
}
