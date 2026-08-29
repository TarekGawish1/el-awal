import { BadRequestException } from '@nestjs/common';

/**
 * Normalizes Arabic text for profanity and insult scanning.
 * Removes diacritics, tatweel, and normalizes similar letter shapes.
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
      // Normalize repeated characters (e.g., احااااااا -> احا, كككككس -> كس)
      .replace(/(.)\1{2,}/g, '$1$1')
  );
}

/**
 * Normalizes English and Franco-Arabic text for profanity scanning.
 * Converts common leetspeak substitutions, Franco numbers, and collapses repeats.
 */
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

/**
 * Comprehensive list of forbidden root terms, profanities, insults, and vulgarities
 * covering Standard Arabic, Egyptian Slang, Franco-Arabic (3rabizi), and English.
 */
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
  /\b(a7a|a7aa|a7aaa|a7eeh|a7ee|a7eeha|a7eha|ahaa|ahhaa|a77a)\b/i,

  // كسم ومشتقاتها
  /\b(k[o0uuee]+s+[o0aaei]*m+[a-z]*)\b/i,
  /\b(ksm|ksmk|kssm|kssmk|ksemk|ksemak)\b/i,
  /\b(k[o0uuee]+s+|k[o0uuee]+s+h?a|k[o0uuee]+s+y|k[o0uuee]+s+ek)\s*(el\s*)?(o+m+[a-z]*|a+m+[a-z]*|e+m+[a-z]*|a+b+[o0uuee]*k*|o+x+t+[a-z]*|o+k+h+t+[a-z]*|[5x]|kh|deen|rab|sharaf|meyet[a-z]*)/i,
  /\b(k[o0uuee]+s+|k[o0uuee]+s+h?a)\b/i,

  // الشتائم والكلمات الجنسية بالفرانكو
  /\b([5x]|kh)aw+a+l[a-z]*\b/i,
  /\b([5x]|kh)o+l\b/i,
  /\b(sh|ch)arm+o+u*t+[a-z]*\b/i,
  /\b(m[aouie]*n[a-z]*y+[o0u]+k[a-z]*|m[aouie]*t*n[a-z]*a+k[a-z]*)\b/i,
  /\b(3|a|aa)a*r+s+[a-z]*|m(3|a|aa)a*r+a*s+[a-z]*|ta(3|a)a*r+e+s+\b/i,
  /\b(t[eio0]+z+[a-z]*|6[eio0]+z+[a-z]*|a+y+r+[eiy]*)\b/i,
  /\b(z[o0ebiu]+b+[a-z]*)\b/i,
  /\b(q|g|k|2|a)a*(7|h)b+[a-z]*\b/i,
  /\b(n[eia]+y*e*k+|y+e*n[eia]+k+|a+n[eia]+k+|t+e*n[eia]+k+)\b/i,
  /\b([5x]|kh)r+a+[a-z]*\b/i,

  // سباب مركب ومنادى بالفرانكو
  /\b(was5[a-z0-9]*|wes5[a-z0-9]*|wasx[a-z0-9]*|wesx[a-z0-9]*|waskh[a-z]*|weskh[a-z]*)\b/i,
  /\b(ebn|ibn)\s*(el\s*)?(kalb|kelb|was5[a-z0-9]*|wes5[a-z0-9]*|waskh[a-z]*|weskh[a-z]*|sharmout[a-z]*|charmout[a-z]*|ga7b[a-z0-9]*|qa7b[a-z0-9]*|7aram|haram|metnak[a-z]*|mitnak[a-z]*|5awal[a-z0-9]*|khawal[a-z]*|3ars[a-z0-9]*|aars[a-z]*)\b/i,
  /\b(ya)\s*(7|h|[5x]|kh|3|a|sh|ch|m|w|n|k|g|q|2|e)[a-z0-9]*\s*(khawal|5awal|3ars|aars|ars|manyook|metnak|was5[a-z0-9]*|wes5[a-z0-9]*|waskh|weskh|kalb|kelb|7mar|hmar|7omar|homar|7ayawan|hayawan|sharmout[a-z]*|charmout[a-z]*|ga7b[a-z0-9]*|gahb[a-z]*|qa7b[a-z0-9]*|qahb[a-z]*|nages|najes|ebn)\b/i,
  /\b(ya)\s*(khawal[a-z0-9]*|5awal[a-z0-9]*|3ars[a-z0-9]*|aars[a-z]*|ars|manyook|metnak|was5[a-z0-9]*|wes5[a-z0-9]*|waskh|weskh|kalb|kelb|7mar|hmar|7omar|homar|7ayawan|hayawan|sharmout|sharmouta|charmouta|ga7ba|gahba|qa7ba|qahba|nages|najes)\b/i,
  /\b(yel(3|a)a*n)\s*(deen[a-z]*|rab[a-z]*|ab[o0u]+k*|o+m+[a-z]*|a+m+[a-z]*|e+m+[a-z]*|meyet[a-z]*|sharaf[a-z]*|asl[a-z]*)\b/i,
  /\b(d[eiy]+n)\s*(o+m+[a-z]*|a+m+[a-z]*|e+m+[a-z]*|ab[o0u]+k*|rab[a-z]*)\b/i,
  /\b(t[o0a]+z+|t+f+[o0u]+)\s*(f[eiy]+k*|3al[eiy]+k*|al[eiy]+k*)\b/i,

  // ── Arabic Profanities & Egyptian Slang Insults ──
  // أحا / احيه ومشتقاتها
  /(^|\s|\W)(احا|أحا|احيه|أحيه|احاا|احييي|احا+)($|\s|\W)/,

  // الشتائم الجنسية وألفاظ العورات
  /(^|\s|\W)(كسم|كسمك|كسك|كسها|كسختك|كسمين|كس_امك|ك_س_م|كس\s*(امك|ام|ابوك|اختك|عرضك|دينك|ميتينك))($|\s|\W)/,
  /(^|\s|\W)(كس|طيز|طياز|طيزك|طيزها|زب|زبي|زبك|شرموط|شرموطه|شرمطه|شرايط|قحبه|قحب|قحاب)($|\s|\W)/,
  /(^|\s|\W)(خول|خوال|خولات|منيوك|منايك|منيكه|متناك|تناك|تنيكه|نيك|ينيك|انيك|منيوكه)($|\s|\W)/,
  /(^|\s|\W)(عرص|معرص|تعريص|عرصة|عرصه|متناكين|تناكه)($|\s|\W)/,
  /(^|\s|\W)(سكس|سكسي|بورن|اباحي|بورنو)($|\s|\W)/,

  // سب الدين واللعن
  /(يلعن\s*(دين|رب|ام|ابو|ميتين|روح|اهل|شرف))/,
  /(دين\s*(امك|ابوك|ربك|دينك))/,

  // الشتائم المركبة والسباب المباشر
  /(ابن\s*(الكلب|كلب|الوسخه|وسخه|الوسخة|وسخة|الشراميط|الشرموطه|الشرموطة|القحبه|القحبة|الحرام|المتناكه|المتناكة|الخول|العرص))/,
  /(يا\s*(وسخ|نجس|معرص|حيوان|حمار|كلب|شرموط|قحبه|خول|منيوك|متناك|ابن الكلب|ابن الوسخه|ابن الشرموطه))/,
  /(عيل\s*(نجس|وسخ|شرموط|خول|معرص|منيوك))/,
  /(طظ\s*فيك|طز\s*فيك|تفو\s*عليك)/,
];

/**
 * Checks if the given text contains any insults or bad words in Arabic, English, or Franco.
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const normalizedAr = normalizeArabicText(text);
  const normalizedEn = normalizeEnglishAndFrancoText(text);

  // Check original, normalized Arabic, and normalized English/Franco versions
  for (const pattern of PROFANITY_PATTERNS) {
    if (
      pattern.test(text) ||
      pattern.test(normalizedAr) ||
      pattern.test(normalizedEn)
    ) {
      return true;
    }
  }

  // Also check compacted spaces / separators attempt (e.g. f u c k, a 7 a, or ك س م)
  const strippedSpacedText = text.replace(/[\s._\-*#]/g, '');
  const strippedAr = normalizeArabicText(strippedSpacedText);
  const strippedEn = normalizeEnglishAndFrancoText(strippedSpacedText);

  for (const pattern of PROFANITY_PATTERNS) {
    if (
      pattern.test(strippedSpacedText) ||
      pattern.test(strippedAr) ||
      pattern.test(strippedEn)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Throws a clean, Arabic user-facing BadRequestException if profanity or insults are detected.
 */
export function assertCleanContent(text: string, _fieldName = 'النص'): void {
  if (containsProfanity(text)) {
    throw new BadRequestException(
      'عذراً، يحتوي النص على كلمات أو عبارات غير لائقة تتعارض مع الآداب العامة للمنصة 🚫',
    );
  }
}
