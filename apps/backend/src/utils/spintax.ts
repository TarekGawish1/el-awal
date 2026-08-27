/**
 * spintax.ts — Message template variation helpers for WhatsApp anti-ban.
 *
 * Produces slightly different Arabic text for each notification batch to avoid
 * identical bit-for-bit messages being flagged as bulk/spam by WhatsApp servers.
 */

// ─── Shared Utilities ──────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function arabicDate(): string {
  return new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function arabicTime(): string {
  return new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Shared Greetings / Closings ───────────────────────────────────────────────

const GREETINGS = [
  'السلام عليكم ورحمة الله وبركاته،',
  'تحية طيبة وبعد، ولي أمر الطالب المحترم،',
  'أهلاً وسهلاً بحضرتك ولي أمر الطالب،',
  'مساء الخير / صباح الخير، ولي أمر الطالب الكريم،',
];

const CLOSINGS = [
  'يرجى التواصل مع إدارة السنتر لمزيد من المتابعة.',
  'شاكرين حسن تعاونكم وحرصكم الدائم على مسيرة أبنائكم.',
  'لأي استفسار يرجى مراسلتنا هنا، ونحن في الخدمة دائماً.',
  'نقدر اهتمامكم ونتمنى التوفيق والنجاح لأبنائنا.',
];

const SIGNATURES = [
  '— منصة الأول التعليمية 📚',
  '— فريق الأول التعليمي ✏️',
  '— إدارة منصة الأول 🎓',
  '',  // occasionally no signature (more human)
];

// ─── Template Functions ─────────────────────────────────────────────────────────

/**
 * Generates a varied absence notification message for a parent.
 */
export function formatAbsenceMessage(
  studentName: string,
  groupName: string,
  dateStr?: string,
): string {
  const greeting = pickRandom(GREETINGS);
  const closing = pickRandom(CLOSINGS);
  const sig = pickRandom(SIGNATURES);
  const date = dateStr || arabicDate();

  const bodies = [
    `نود إحاطتكم علماً بغياب الطالب/ة *${studentName}* عن حصة *${groupName}* بتاريخ ${date}.`,
    `نُعلمكم بأن الطالب/ة *${studentName}* لم يحضر حصة *${groupName}* يوم ${date}.`,
    `تنبيه: سُجِّل غياب الطالب/ة *${studentName}* عن مجموعة *${groupName}* اليوم ${date}.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body, '', closing];
  if (sig) parts.push(sig);
  return parts.join('\n');
}

/**
 * Generates a varied session reminder message for a parent.
 */
export function formatSessionReminderMessage(
  studentName: string,
  groupName: string,
  startTime: string,
): string {
  const greeting = pickRandom(GREETINGS);
  const sig = pickRandom(SIGNATURES);

  const bodies = [
    `تذكير: لدى الطالب/ة *${studentName}* حصة في مجموعة *${groupName}* الساعة *${startTime}* اليوم. يرجى التأكد من الحضور في الموعد.`,
    `تنبيه: موعد حصة *${groupName}* للطالب/ة *${studentName}* الساعة *${startTime}* اليوم. لا تفوّتها! 📖`,
    `تذكير بموعد الحصة: *${groupName}* الساعة *${startTime}* — الطالب/ة *${studentName}*. حضوركم في الوقت المحدد مطلوب.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body];
  if (sig) parts.push('\n' + sig);
  return parts.join('\n');
}

/**
 * Generates a varied exam failed alert for a parent.
 */
export function formatExamFailedMessage(
  studentName: string,
  examTitle: string,
  score: number,
  total: number,
  passing: number,
): string {
  const greeting = pickRandom(GREETINGS);
  const closing = pickRandom(CLOSINGS);
  const sig = pickRandom(SIGNATURES);

  const bodies = [
    `نود إعلامكم بأن الطالب/ة *${studentName}* حصل على درجة *${score}/${total}* في اختبار *${examTitle}*، وهي أقل من درجة النجاح (${passing}). يُرجى المتابعة.`,
    `تنبيه هام: نتيجة الطالب/ة *${studentName}* في *${examTitle}* كانت *${score}/${total}* ولم تبلغ حد النجاح البالغ ${passing} درجة. نوصي بالمراجعة.`,
    `إشعار تقييم: سجّل الطالب/ة *${studentName}* درجة *${score} من ${total}* في اختبار *${examTitle}*. درجة النجاح ${passing}. نرجو المتابعة مع المدرس.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body, '', closing];
  if (sig) parts.push(sig);
  return parts.join('\n');
}

/**
 * Generates a varied payment confirmation message.
 */
export function formatPaymentMessage(
  studentName: string,
  amount: number,
  month: number,
  year: number,
): string {
  const greeting = pickRandom(GREETINGS);
  const sig = pickRandom(SIGNATURES);
  const time = arabicTime();

  const bodies = [
    `✅ تم استلام مبلغ *${amount} ج.م* مصروفات شهر *${month}/${year}* للطالب/ة *${studentName}* بنجاح — ${time}.`,
    `إشعار دفع: تأكيد استلام رسوم *${studentName}* عن شهر *${month}/${year}* بقيمة *${amount} جنيه* — ${time}.`,
    `تم التسجيل ✔️ — مصروفات الطالب/ة *${studentName}* لشهر *${month}/${year}* (*${amount} ج.م*) وردت في ${time}.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body];
  if (sig) parts.push('\n' + sig);
  return parts.join('\n');
}

/**
 * Generates a teacher daily agenda message.
 */
export function formatTeacherAgendaMessage(
  teacherName: string,
  dateStr: string,
  sessionLines: string[],
): string {
  const sigs = [
    '📋 منصة الأول التعليمية — نتمنى لك يوماً موفقاً 🌟',
    '✨ فريق الأول — بالتوفيق في يومك أستاذ!',
    '🎓 منصة الأول — جدول اليوم جاهز!',
  ];

  const intros = [
    `صباح الخير أستاذ *${teacherName}* 👋\nجدولك لهذا اليوم *${dateStr}*:`,
    `مرحباً أستاذ *${teacherName}* ☀️\nهذا جدولك اليوم *${dateStr}*:`,
    `أستاذ *${teacherName}*، صباح النور! 🌅\nمواعيد حصصك اليوم *${dateStr}*:`,
  ];

  const intro = pickRandom(intros);
  const sig = pickRandom(sigs);
  const agenda = sessionLines.map((l, i) => `${i + 1}. ${l}`).join('\n');

  return `${intro}\n\n${agenda}\n\n${sig}`;
}

/**
 * Generates a generic notification message with variation.
 * Used as fallback for any notification type not covered above.
 */
export function formatGenericMessage(title: string, body: string): string {
  const greeting = pickRandom(GREETINGS);
  const sig = pickRandom(SIGNATURES);
  const parts = [greeting, '', `*${title}*`, '', body];
  if (sig) parts.push('\n' + sig);
  return parts.join('\n');
}
