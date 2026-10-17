/**
 * spintax.ts — Message template variation helpers for WhatsApp anti-ban.
 *
 * Produces slightly different Arabic text for each notification batch to avoid
 * identical bit-for-bit messages being flagged as bulk/spam by WhatsApp servers.
 */

// ─── Shared Utilities ──────────────────────────────────────────────────────────

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function renderSpintax(template: string): string {
  return template.replace(/\{([^{}]+)\}/g, (_, choices) => {
    const parts = choices.split('|');
    return pickRandom(parts);
  });
}

function arabicDate(): string {
  return new Date().toLocaleDateString('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function arabicTime(): string {
  return new Date().toLocaleTimeString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Shared Greetings / Closings ───────────────────────────────────────────────

export const GREETINGS = [
  'السلام عليكم ورحمة الله وبركاته،',
  'تحية طيبة وبعد، ولي أمر الطالب المحترم،',
  'أهلاً وسهلاً بحضرتك ولي أمر الطالب،',
  'مساء الخير / صباح الخير، ولي أمر الطالب الكريم،',
];

export const ASSISTANT_GREETINGS = [
  'السلام عليكم ورحمة الله وبركاته،',
  'تحية طيبة وبعد، أ/ المساعد المحترم،',
  'أهلاً وسهلاً بحضرتك،',
  'مساء الخير / صباح الخير،',
];

export const CLOSINGS = [
  'يرجى التواصل مع إدارة السنتر لمزيد من المتابعة.',
  'شاكرين حسن تعاونكم وحرصكم الدائم على مسيرة أبنائكم.',
  'لأي استفسار يرجى مراسلتنا هنا، ونحن في الخدمة دائماً.',
  'نقدر اهتمامكم ونتمنى التوفيق والنجاح لأبنائنا.',
];

export const SIGNATURES = [
  'منصة الأول للرياضيات - أستاذ أحمد غريب 📐',
  '— منصة الأول للرياضيات - أستاذ أحمد غريب 📐',
  'منصة الأول للرياضيات - أستاذ أحمد غريب ✨',
];

// Re-export auth and credential message generators for full backward compatibility
export * from './spintax-auth';

// ─── Event Notification Templates ─────────────────────────────────────────────

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
  const sig = 'منصة الأول للرياضيات - أستاذ أحمد غريب 📐';
  const date = dateStr || arabicDate();

  const bodies = [
    `نود إحاطتكم علماً بغياب الطالب/ة *${studentName}* عن حصة الرياضيات مع *أستاذ أحمد غريب* في مجموعة (*${groupName}*) بتاريخ ${date}.`,
    `نُعلمكم بأن الطالب/ة *${studentName}* لم يحضر حصة الرياضيات مع *أستاذ أحمد غريب* لمجموعة (*${groupName}*) يوم ${date}.`,
    `تنبيه: سُجِّل غياب الطالب/ة *${studentName}* عن مجموعة (*${groupName}*) في مادة الرياضيات مع *أستاذ أحمد غريب* اليوم ${date}.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body, '', closing, '', sig];
  return parts.join('\n');
}

/**
 * Generates an apology and correction message for a parent when a student's
 * absence was marked by mistake and subsequently corrected to present/attended.
 */
export function formatAbsenceCorrectionMessage(
  studentName: string,
  groupName: string,
  dateStr?: string,
): string {
  const greeting = pickRandom(GREETINGS);
  const sig = 'منصة الأول للرياضيات - أستاذ أحمد غريب 📐';
  const date = dateStr || arabicDate();

  const bodies = [
    `🌸 *تصحيح واعتذار:*\nنعتذر لحضرتكم عن الإشعار السابق بالغياب؛ نود إحاطتكم بأن الطالب/ة: *${studentName}* قد حضر بالفعل حصة الرياضيات مع *أستاذ أحمد غريب* في مجموعة (*${groupName}*) بتاريخ ${date} وتم رصد حضوره بنجاح.`,
    `🌸 *تنويه وتصحيح:*\nنعتذر عن وصول رسالة الغياب السابقة بالخطأ؛ نؤكد لحضرتكم حضور الطالب/ة: *${studentName}* لحصة الرياضيات مع *أستاذ أحمد غريب* لمجموعة (*${groupName}*) اليوم ${date} وتسجيل حضوره رسمياً.`,
    `🌸 *تصحيح تسجيل الحضور:*\nنعتذر لحضرتكم عن أي إشعار سابق بالغياب صدر عن طريق السهو؛ نود إفادتكم بأن الطالب/ة: *${studentName}* متواجد بالحصة وحاضر مع *أستاذ أحمد غريب* في مجموعة (*${groupName}*) بتاريخ ${date}.`,
  ];

  const body = pickRandom(bodies);
  const closing = 'نسعد دائماً بوجود أبنائنا معنا، ونتمنى له دوام التوفيق والتفوق! 🌟';
  return [greeting, '', body, '', closing, '', sig].join('\n');
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
    `إشعار تقييم: سجّل الطالب/ة *${studentName}* درجة *${score} من ${total}* في اختبار *${examTitle}* في مادة الرياضيات مع *أستاذ أحمد غريب*. درجة النجاح ${passing}. نرجو المتابعة.`,
  ];

  const body = pickRandom(bodies);
  const parts = [greeting, '', body, '', closing];
  if (sig) parts.push(sig);
  return parts.join('\n');
}

export interface PaymentNotificationData {
  parentName?: string;
  studentName: string;
  amount: number;
  currency?: string;
  paymentType: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  remainingBalance?: number;
  centerName?: string;
}

/**
 * Generates an automated payment receipt message for a parent sent via WhatsApp & Push.
 */
export function formatPaymentReceivedMessage(data: PaymentNotificationData): string {
  const {
    parentName = 'ولي الأمر المحترم',
    studentName,
    amount,
    currency = 'جنيه',
    paymentType,
    invoiceNumber,
    paymentMethod = 'نقدي / السنتر',
    remainingBalance = 0,
    centerName = 'منصة الأول للرياضيات - أستاذ أحمد غريب',
  } = data;

  const dateStr = new Date().toLocaleDateString('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = arabicTime();

  const greetings = [
    `السلام عليكم ورحمة الله وبركاته،\nأهلاً بحضرتك ${parentName} 🌸`,
    `تحية طيبة وبعد، أهلاً بحضرتك ${parentName} الكريم 🌸`,
    `السلام عليكم ورحمة الله،\nمرحباً بحضرتك ${parentName} 🌟`,
  ];

  const intros = [
    `تم بنجاح تأكيد استلام دفعة مالية جديدة للطالب/ة: *${studentName}* لدى *${centerName}*. ✅`,
    `يسعدنا إفادتكم بتسجيل إيصال سداد للطالب/ة: *${studentName}* لدى *${centerName}* بنجاح. 🧾`,
    `تم استلام وتأكيد سداد الرسوم للطالب/ة: *${studentName}* في *${centerName}*. 🌟`,
  ];

  const receiptBlock = `🧾 *تفاصيل عملية الدفع:*
- البند: *${paymentType}*
- المبلغ المدفوع: *${amount} ${currency}*
${invoiceNumber ? `- رقم الإيصال: \`#${invoiceNumber}\`\n` : ''}- طريقة الدفع: ${paymentMethod}
- التاريخ والوقت: ${dateStr} (${timeStr})
${remainingBalance > 0 ? `- المتبقي: *${remainingBalance} ${currency}*` : '- حالة الحساب: *مسدد بالكامل* ✅'}`;

  const closings = [
    'شاكرين لثقتكم وحرصكم الدائم. للرجوع إلى سجل المدفوعات الكامل يمكنكم زيارة لوحة تحكم ولي الأمر 📚',
    'نتمنى لأبنائنا دوام التوفيق والتفوق، نسعد دائماً بخدمتكم 🌟',
    'شاكرين لكم تعاونكم الدائم، متمنين لأبنائنا دوام النجاح والتميز ✨',
  ];

  const greeting = pickRandom(greetings);
  const intro = pickRandom(intros);
  const closing = pickRandom(closings);
  const sig = pickRandom(SIGNATURES);

  const parts = [greeting, '', intro, '', receiptBlock, '', closing];
  if (sig) parts.push('', sig);
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
    `✅ تم استلام مبلغ *${amount} ج.م* مصروفات شهر *${month}/${year}* للطالب/ة *${studentName}* لدى *أستاذ أحمد غريب* بنجاح — ${time}.`,
    `إشعار دفع: تأكيد استلام رسوم *${studentName}* عن شهر *${month}/${year}* بقيمة *${amount} جنيه* في مادة الرياضيات مع *أستاذ أحمد غريب* — ${time}.`,
    `تم التسجيل ✔️ — مصروفات الطالب/ة *${studentName}* لشهر *${month}/${year}* (*${amount} ج.م*) لدى *أستاذ أحمد غريب* وردت في ${time}.`,
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
    '📋 منصة الأول التعليمية — نتمنى لك يوماً موفقاً ومثمراً 🌟',
    '✨ فريق الأول — بالتوفيق والنجاح في يومك أستاذنا!',
    '🎓 منصة الأول — يوم تعليمي موفق ومبارك بإذن الله 🌟',
  ];

  const sig = pickRandom(sigs);
  const cleanSessionLines = (sessionLines || []).filter(
    (l) => typeof l === 'string' && l.trim() && !l.includes('لا توجد حصص مجدولة'),
  );

  if (cleanSessionLines.length === 0) {
    const emptyIntros = [
      `صباح الخير أستاذ *${teacherName}* 👋\nنود إعلامك بأنه لا توجد لديك أي حصص أو مجموعات مجدولة لهذا اليوم (*${dateStr}*). نتمنى لك يوماً سعيداً ومريحاً! 🌸`,
      `مرحباً بحضرتك أستاذ *${teacherName}* ☀️\nجدولك اليوم (*${dateStr}*) فارغ — لا توجد حصص دراسية مجدولة لهذا اليوم. نتمنى لك وقتاً طيباً ومثمراً! 🌿`,
      `أستاذ *${teacherName}*، صباح النور والبركة! 🌅\nلا توجد حصص مجدولة لك اليوم (*${dateStr}*). نتمنى لك يوماً سعيداً وموفقاً! 🌟`,
    ];
    const intro = pickRandom(emptyIntros);
    return `${intro}\n\n${sig}`;
  }

  const intros = [
    `صباح الخير أستاذ *${teacherName}* 👋\nإليك جدول حصصك ومجموعاتك المجدولة اليوم (*${dateStr}*):`,
    `مرحباً بحضرتك أستاذ *${teacherName}* ☀️\nجدولك ومواعيد الحصص اليوم (*${dateStr}*):`,
    `أستاذ *${teacherName}*، صباح النور والبركة! 🌅\nمواعيد حصصك ومجموعاتك اليوم (*${dateStr}*):`,
  ];

  const intro = pickRandom(intros);
  const agenda = cleanSessionLines
    .map((l, i) => (/^\d+[\.\-]/.test(l.trim()) ? l.trim() : `${i + 1}. ${l.trim()}`))
    .join('\n');

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
