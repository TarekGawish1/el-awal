/**
 * Normalizes text for search comparisons across Arabic and English.
 * Ensures:
 * 1. Diacritics (tashkeel) and Tatweel (kashida) are removed.
 * 2. All variants of Alif (أ, إ, آ, ٱ, ا) are equated.
 * 3. Words starting with 'i' / 'I' and 'ا' are equated in search.
 * 4. Teh Marbuta (ة) and Heh (ه) are equated.
 * 5. Alef Maksura (ى) and Yeh (ي) are equated.
 * 6. Case-insensitive and trimmed.
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';

  return (
    text
      .toLowerCase()
      // Remove Arabic diacritics (tashkeel: fatha, damma, kasra, sukun, shadda, tanwin)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      // Remove Tatweel (kashida)
      .replace(/[\u0640]/g, '')
      // Normalize all Alif variants (أ, إ, آ, ٱ) to standard Alif (ا)
      .replace(/[إأآٱ]/g, 'ا')
      // Treat leading 'i' / 'I' at word start as 'ا' so names starting with 'i' (e.g. islam, ibrahim) match 'ا'
      .replace(/(?:^|\s)[iI]/g, (match) => match.replace(/[iI]/, 'ا'))
      // Normalize Teh Marbuta (ة) to Heh (ه)
      .replace(/ة/g, 'ه')
      // Normalize Alef Maksura (ى) to Yeh (ي)
      .replace(/ى/g, 'ي')
      // Normalize Hamza forms (ؤ, ئ)
      .replace(/[ؤئ]/g, 'ء')
      .trim()
  );
}

/**
 * Checks if a target string matches a search query using normalized Arabic & English search.
 */
export function matchesSearch(target: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  const normalizedTarget = normalizeForSearch(target);
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return true;

  // Direct substring inclusion
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // Tokenized multi-word search (all search tokens must match)
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => normalizedTarget.includes(token));
  }

  return false;
}
