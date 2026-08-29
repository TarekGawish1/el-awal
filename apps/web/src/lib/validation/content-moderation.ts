/**
 * Frontend Content Moderation & Profanity / Bad Words Validation
 * Protects course discussions and comments from Arabic, Franco-Arabic, and English insults.
 */

export function normalizeArabicText(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove Arabic diacritics (tashkeel)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      // Remove Tatweel (kashida)
      .replace(/[\u0640]/g, '')
      // Normalize Alef variants
      .replace(/[إأآٱ]/g, 'ا')
      // Normalize Teh Marbuta to Heh
      .replace(/ة/g, 'ه')
      // Normalize Alef Maksura to Yeh
      .replace(/ى/g, 'ي')
      // Normalize Hamza forms
      .replace(/[ؤئ]/g, 'ء')
      // Normalize repeated characters (e.g. احاااا -> احا)
      .replace(/(.)\1{2,}/g, '$1$1')
  );
}

export function normalizeEnglishAndFrancoText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/(.)\1{2,}/g, '$1$1');
}

const PROFANITY_PATTERNS: RegExp[] = [
  // ── English Profanities & Insults ──
  /\b(fuck|fucker|fucking|fucked|fck|f\*ck|fuuck|fook|stfu|motherfucker|mf)\b/i,
  /\b(bitch|bitches|bitching|bitchy|btch|b!tch|b1tch|son of a bitch|sob)\b/i,
  /\b(shit|bullshit|shitty|sh\*t|sh!t|dipshit|horseshit)\b/i,
  /\b(asshole|ass|arse|arsehole|a\$\$hole|dumbass|jackass)\b/i,
  /\b(cunt|cunts|c\*nt|c!nt)\b/i,
  /\b(dick|dickhead|dildo|d!ck|cock|cocksucker)\b/i,
  /\b(pussy|pussies|p\*ssy|p!ssy)\b/i,
  /\b(bastard|bastards|slut|sluts|whore|whores|wh0re|skank|hoe)\b/i,
  /\b(nigger|nigga|n1gger|n!gga|fag|faggot|retard|retarded|kys)\b/i,

  // ── Franco-Arabic (3rabizi / Chat Arabic) Insults & Profanities ──
  // أحا / احيه
  /\b(a7a|a7aa|a7aaa|a7eeh|a7ee|a7eeha|a7eha)\b/i,

  // كسم ومشتقاتها
  /\b(kosom|kosomk|kosmak|kosomak|kossom|kossomk|kossomak|kossmak|kos_omak|kos_omk|kos_om|koss|kossy|kossek|kossaha)\b/i,
  /\b(ksm|ksmk|kssm|kssmk|kos_emk|kos_emak)\b/i,

  // الشتائم والكلمات الجنسية بالفرانكو
  /\b(sharmout|sharmouta|sharmota|sharmata|shraiet|sharmouti|sharmateen)\b/i,
  /\b(5awal|5awalat|5awel|5ewal|5wal|5awala|5awalaty)\b/i,
  /\b(manyook|manyoook|manayek|menayek|motnak|metnak|motnaak|metnakin|metnakeen|metnaka)\b/i,
  /\b(3ars|3r9|3arsan|m3aras|m3rs|ta3rees|3arsa|3rs|m3araseen)\b/i,
  /\b(teez|teezak|tezo|tezk|teezha|6eez|6eezak|6eezha)\b/i,
  /\b(zob|zoby|zobak|zeb|zeby|zebak|zebe|zobo)\b/i,
  /\b(qa7ba|ga7ba|2a7ba|ka7ba|qa7ab|ga7ab|2a7ab)\b/i,
  /\b(neek|nayek|yeneek|aneek|teneek|teneka|5ra|5ara|5araa)\b/i,

  // سباب مركب بالفرانكو
  /\b(ebn\s*(el\s*)?(kalb|was5a|wes5a|wesxa|was5ah|wes5ah|sharmouta|sharmota|ga7ba|qa7ba|7aram|metnaka))\b/i,
  /\b(ya\s*(7ayawan|7mar|7omar|kalb|5awal|3ars|was5|wes5|nages|sharmout|sharmouta|manyook|metnak|ebn\s*el\s*(kalb|was5a|sharmouta)))\b/i,
  /\b(yel3an\s*(deenak|rabak|abook|omak|meyeteenak|meyeteeenak|sharafak))\b/i,
  /\b(deen\s*(omak|abook|rabak))\b/i,
  /\b(toz\s*feek|taz\s*feek|tozz\s*feek)\b/i,

  // ── Arabic Profanities & Egyptian Slang Insults ──
  // أحا / احيه ومشتقاتها
  /(^|\s|\W)(احا|أحا|احيه|أحيه|احاا|احييي)($|\s|\W)/,

  // الشتائم الجنسية وألفاظ العورات
  /(^|\s|\W)(كسم|كسمك|كسك|كسها|كسختك|كسمين|كس_امك|ك_س_م)($|\s|\W)/,
  /(^|\s|\W)(كس|طيز|طياز|طيزك|طيزها|زب|زبي|زبك|شرموط|شرموطه|شرمطه|شرايط|قحبه|قحب|قحاب)($|\s|\W)/,
  /(^|\s|\W)(خول|خوال|خولات|منيوك|منايك|منيكه|متناك|تناك|تنيكه|نيك|ينيك|انيك|منيوكه)($|\s|\W)/,
  /(^|\s|\W)(عرص|معرص|تعريص|عرصة|عرصه|متناكين|تناكه)($|\s|\W)/,
  /(^|\s|\W)(سكس|سكسي|بورن|اباحي|بورنو)($|\s|\W)/,

  // سب الدين واللعن
  /(يلعن\s*(دين|رب|ام|ابو|ميتين|روح|اهل|شرف))/,
  /(دين\s*امك|دين\s*ابوك)/,

  // الشتائم المركبة والسباب المباشر
  /(ابن\s*(الكلب|كلب|الوسخه|وسخه|الوسخة|وسخة|الشراميط|الشرموطه|الشرموطة|القحبه|القحبة|الحرام|المتناكه|المتناكة))/,
  /(يا\s*(وسخ|نجس|معرص|حيوان|حمار|كلب|شرموط|قحبه|خول|منيوك|ابن الكلب|ابن الوسخه|ابن الشرموطه))/,
  /(عيل\s*(نجس|وسخ|شرموط|خول|معرص))/,
  /(طظ\s*فيك|طز\s*فيك|تفو\s*عليك)/,
];

/**
 * Validates text for profanities, insults, or bad words.
 * Returns null if clean, or an Arabic error message if inappropriate content is found.
 */
export function validateContentProfanity(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  const normalizedAr = normalizeArabicText(text);
  const normalizedEn = normalizeEnglishAndFrancoText(text);

  for (const pattern of PROFANITY_PATTERNS) {
    if (
      pattern.test(text) ||
      pattern.test(normalizedAr) ||
      pattern.test(normalizedEn)
    ) {
      return 'عذراً، يحتوي النص على كلمات أو عبارات غير لائقة تتعارض مع الآداب العامة للمنصة 🚫';
    }
  }

  const strippedSpacedText = text.replace(/[\s._\-*#]/g, '');
  const strippedAr = normalizeArabicText(strippedSpacedText);
  const strippedEn = normalizeEnglishAndFrancoText(strippedSpacedText);

  for (const pattern of PROFANITY_PATTERNS) {
    if (
      pattern.test(strippedSpacedText) ||
      pattern.test(strippedAr) ||
      pattern.test(strippedEn)
    ) {
      return 'عذراً، يحتوي النص على كلمات أو عبارات غير لائقة تتعارض مع الآداب العامة للمنصة 🚫';
    }
  }

  return null;
}
