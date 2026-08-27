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

export interface StudentApprovalCredentialsData {
  parentName?: string;
  studentName: string;
  studentPhoneOrCode: string;
  studentPassword?: string;
  parentPhoneOrCode?: string;
  parentPassword?: string;
  platformUrl?: string;
  centerName?: string;
  groupName?: string;
}

export function formatLocalEgyptianPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits;
  }
  return phone;
}

/**
 * Generates an automated welcome message with login credentials for parent and student
 * sent via WhatsApp when student registration/enrollment is approved by teacher.
 */
export function formatStudentApprovalMessage(data: StudentApprovalCredentialsData): string {
  const {
    parentName = 'ولي الأمر المحترم',
    studentName,
    studentPhoneOrCode,
    studentPassword,
    parentPhoneOrCode,
    parentPassword,
    platformUrl = 'https://al-awal.online/login',
    centerName = 'منصة الأوّل التعليمية',
    groupName,
  } = data;

  const displayStudentPhone = formatLocalEgyptianPhone(studentPhoneOrCode);
  const displayParentPhone = parentPhoneOrCode ? formatLocalEgyptianPhone(parentPhoneOrCode) : '';

  const greetings = [
    `السلام عليكم ورحمة الله وبركاته،\nأهلاً بحضرتك ${parentName} 🌸`,
    `تحية طيبة وبعد، أهلاً بحضرتك ${parentName} الكريم 🌸`,
    `السلام عليكم ورحمة الله،\nمرحباً بحضرتك ${parentName} 🌟`,
  ];

  const groupInfo = groupName ? ` في (*${groupName}*)` : '';

  const approvalIntros = [
    `تمت الموافقة بنجاح على انضمام الطالب/ة: *${studentName}*${groupInfo} إلى *${centerName}*. 🎉`,
    `يسعدنا إبلاغكم بقبول تسجيل الطالب/ة: *${studentName}*${groupInfo} لدى *${centerName}*. 🎓`,
    `تم تأكيد وقبول انضمام الطالب/ة: *${studentName}*${groupInfo} إلى *${centerName}* بنجاح. ✅`,
  ];

  const baseUrl = (platformUrl || 'https://al-awal.online')
    .replace(/\/+$/, '')
    .replace(/\/(login|parent-access)$/, '');

  const studentCreds = `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`${displayStudentPhone}\`
${studentPassword ? `- كلمة المرور: \`${studentPassword}\`` : '- كلمة المرور: كلمة المرور التي اختارها الطالب أثناء التسجيل'}
🔗 رابط دخول الطالب: ${baseUrl}/login`;

  const parentCreds = `📌 *بوابة ولي الأمر (لمتابعة الحضور، الغياب، والدرجات):*
- يمكن لولي الأمر الدخول مباشرة وبكل سهولة بإدخال رقم هاتف الطالب \`${displayStudentPhone}\`${displayParentPhone && displayParentPhone !== displayStudentPhone ? ` (أو رقم هاتف ولي الأمر \`${displayParentPhone}\`)` : ''}.
${parentPassword ? `- كلمة المرور: \`${parentPassword}\`\n` : ''}🔗 رابط دخول ولي الأمر السريع:
${baseUrl}/parent-access`;

  const closings = [
    'يرجى الاحتفاظ بهذه الرسالة للرجوع إليها دائماً. نتمنى لطالبنا دوام التوفيق والنجاح 🌟',
    'نرجو الاحتفاظ بهذه البيانات لتسجيل الدخول ومتابعة مسيرة الطالب أولاً بأول 📚✨',
    'نسعد بوجودكم معنا، ونتمنى لأبنائنا رحلة تعليمية مليئة بالتميز والتفوق 🚀',
  ];

  const greeting = pickRandom(greetings);
  const intro = pickRandom(approvalIntros);
  const closing = pickRandom(closings);
  const sig = pickRandom(SIGNATURES);

  const parts = [
    greeting,
    '',
    intro,
    '',
    studentCreds,
    '',
    parentCreds,
    '',
    closing,
  ];

  if (sig) parts.push('', sig);

  return parts.filter((p) => p !== undefined).join('\n');
}

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
    centerName = 'منصة الأوّل التعليمية',
  } = data;

  const dateStr = new Date().toLocaleDateString('ar-EG', {
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
