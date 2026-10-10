/**
 * Utility for Arabic name normalization and similarity matching.
 * Used for detecting duplicate student registrations under the same parent/guardian.
 */

export function normalizeArabicName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    // Remove Arabic diacritics / harakat and tatweel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize Alef variations
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta to Haa
    .replace(/ة/g, 'ه')
    // Normalize Alef Maqsura to Yaa
    .replace(/ى/g, 'ي')
    // Normalize Hamza variations
    .replace(/[ؤئ]/g, 'ء')
    // Replace non-alphanumeric/non-Arabic characters with space
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether two student names under the same parent represent the same student.
 *
 * Rules:
 * - Siblings MUST have different first names (e.g. "أحمد" vs "سارة"). If first names differ, returns false.
 * - If first name matches AND father/second name matches (e.g. "نسمة أحمد" vs "نسمة أحمد السيد"), returns true (duplicate).
 * - If first name matches and one name is a subset or prefix of the other, returns true (duplicate).
 */
export function isSimilarStudentName(nameA: string, nameB: string): boolean {
  const normA = normalizeArabicName(nameA);
  const normB = normalizeArabicName(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // First name check: if first names are distinct, they are siblings!
  if (tokensA[0] !== tokensB[0]) {
    return false;
  }

  // If first name is identical:
  // If either has only 1 token, e.g. "محمد" vs "محمد علي" -> duplicate attempt
  if (tokensA.length === 1 || tokensB.length === 1) {
    return true;
  }

  // If first two tokens match: e.g. "نسمة احمد" vs "نسمة احمد السيد"
  if (tokensA[0] === tokensB[0] && tokensA[1] === tokensB[1]) {
    return true;
  }

  // Check if shorter name tokens are a subsequence of the longer name
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  let sIdx = 0;
  for (let lIdx = 0; lIdx < longer.length && sIdx < shorter.length; lIdx++) {
    if (longer[lIdx] === shorter[sIdx]) {
      sIdx++;
    }
  }
  if (sIdx === shorter.length) {
    return true;
  }

  return false;
}
