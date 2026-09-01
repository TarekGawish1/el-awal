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

const GREETINGS = [
  'السلام عليكم ورحمة الله وبركاته،',
  'تحية طيبة وبعد، ولي أمر الطالب المحترم،',
  'أهلاً وسهلاً بحضرتك ولي أمر الطالب،',
  'مساء الخير / صباح الخير، ولي أمر الطالب الكريم،',
];

const ASSISTANT_GREETINGS = [
  'السلام عليكم ورحمة الله وبركاته،',
  'تحية طيبة وبعد، أ/ المساعد المحترم،',
  'أهلاً وسهلاً بحضرتك،',
  'مساء الخير / صباح الخير،',
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
 * sent via WhatsApp when student registers a new account on the platform.
 */
export function formatStudentRegistrationMessage(data: StudentApprovalCredentialsData): string {
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

  const groupPendingNotice = groupName
    ? `\n📌 تم تسجيل طلب الانضمام إلى (*${groupName}*) وهو قيد المراجعة حالياً من قبل المعلم. ⏳\n`
    : '';

  const registrationIntros = [
    `تم إنشاء حساب الطالب/ة: *${studentName}* بنجاح على *${centerName}*. 🎉${groupPendingNotice}`,
    `يسعدنا تأكيد إنشاء حساب الطالب/ة: *${studentName}* لدى *${centerName}*. 🎓${groupPendingNotice}`,
    `أهلاً بكم في *${centerName}*! تم إنشاء حساب الطالب/ة: *${studentName}* بنجاح. 🚀${groupPendingNotice}`,
  ];

  const baseUrl = (platformUrl || 'https://al-awal.online')
    .replace(/\/+$/, '')
    .replace(/\/(login|parent-access)$/, '');

  const directPhone = displayParentPhone || displayStudentPhone || studentPhoneOrCode;
  const cleanParentPass = parentPassword && !/[\s\u0600-\u06FF]/.test(parentPassword) ? parentPassword : '';
  const cleanStudentPass = studentPassword && !/[\s\u0600-\u06FF]/.test(studentPassword) ? studentPassword : '';
  const directPass = cleanParentPass || cleanStudentPass || '';
  const parentDirectAccessUrl = directPass
    ? `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}&pass=${encodeURIComponent(directPass)}`
    : `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}`;

  const studentCreds = `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`${displayStudentPhone}\`
- كلمة المرور: \`${cleanStudentPass || studentPassword || 'كلمة المرور المحددة للطالب'}\`
🔗 رابط دخول الطالب: ${baseUrl}/login`;

  const displayParentPass = cleanParentPass || cleanStudentPass || '';
  const parentCreds = `📌 *بوابة ولي الأمر (لمتابعة الحضور، الغياب، والدرجات):*
- يمكن لولي الأمر الدخول مباشرة وبضغطة واحدة دون الحاجة لكتابة أي بيانات عبر الرابط التالي:
🔗 رابط دخول ولي الأمر المباشر:
${parentDirectAccessUrl}

📌 *أو الدخول ببيانات الحساب عبر صفحة الدخول:*
- رقم هاتف الحساب: \`${displayParentPhone || displayStudentPhone}\`
${displayParentPass ? `- كلمة المرور: \`${displayParentPass}\`` : ''}`;

  const closings = [
    'يرجى الاحتفاظ بهذه الرسالة للرجوع إليها دائماً. نتمنى لطالبنا دوام التوفيق والنجاح 🌟',
    'نرجو الاحتفاظ بهذه البيانات لتسجيل الدخول ومتابعة مسيرة الطالب أولاً بأول 📚✨',
    'نسعد بوجودكم معنا، ونتمنى لأبنائنا رحلة تعليمية مليئة بالتميز والتفوق 🚀',
  ];

  const greeting = pickRandom(greetings);
  const intro = pickRandom(registrationIntros);
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

/**
 * Generates an automated approval message sent via WhatsApp
 * ONLY after the teacher actually approves/accepts student enrollment in a group.
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
    `تمت الموافقة بنجاح على قبول وانضمام الطالب/ة: *${studentName}*${groupInfo} لدى *${centerName}*. 🎉✅`,
    `يسعدنا إبلاغكم بالموافقة الرسمية على انضمام الطالب/ة: *${studentName}*${groupInfo} إلى *${centerName}*. 🎓`,
    `تم تأكيد وقبول انضمام الطالب/ة: *${studentName}*${groupInfo} إلى *${centerName}* بنجاح. ✅`,
  ];

  const baseUrl = (platformUrl || 'https://al-awal.online')
    .replace(/\/+$/, '')
    .replace(/\/(login|parent-access)$/, '');

  const directPhone = displayParentPhone || displayStudentPhone || studentPhoneOrCode;
  const cleanParentPass = parentPassword && !/[\s\u0600-\u06FF]/.test(parentPassword) ? parentPassword : '';
  const cleanStudentPass = studentPassword && !/[\s\u0600-\u06FF]/.test(studentPassword) ? studentPassword : '';
  const directPass = cleanParentPass || cleanStudentPass || '';
  const parentDirectAccessUrl = directPass
    ? `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}&pass=${encodeURIComponent(directPass)}`
    : `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}`;

  const studentCreds = `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`${displayStudentPhone}\`
- كلمة المرور: \`${cleanStudentPass || studentPassword || 'كلمة المرور الخاصة بالطالب'}\`
🔗 رابط دخول الطالب: ${baseUrl}/login`;

  const displayParentPass = cleanParentPass || cleanStudentPass || '';
  const parentCreds = `📌 *بوابة ولي الأمر (لمتابعة الحضور، الغياب، والدرجات):*
- يمكن لولي الأمر الدخول مباشرة وبضغطة واحدة دون الحاجة لكتابة أي بيانات عبر الرابط التالي:
🔗 رابط دخول ولي الأمر المباشر:
${parentDirectAccessUrl}

📌 *أو الدخول ببيانات الحساب عبر صفحة الدخول:*
- رقم هاتف الحساب: \`${displayParentPhone || displayStudentPhone}\`
${displayParentPass ? `- كلمة المرور: \`${displayParentPass}\`` : ''}`;

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

/**
 * Generates an automated notification sent via WhatsApp when student submits a group reservation request
 * (before teacher approves it).
 */
export function formatGroupReservationPendingMessage(data: {
  parentName?: string;
  studentName: string;
  groupName?: string;
  teacherName?: string;
  centerName?: string;
}): string {
  const {
    parentName = 'ولي الأمر المحترم',
    studentName,
    groupName = 'المجموعة',
    centerName = 'منصة الأوّل التعليمية',
  } = data;

  const greetings = [
    `السلام عليكم ورحمة الله وبركاته،\nأهلاً بحضرتك ${parentName} 🌸`,
    `تحية طيبة وبعد، أهلاً بحضرتك ${parentName} الكريم 🌸`,
    `السلام عليكم ورحمة الله،\nمرحباً بحضرتك ${parentName} 🌟`,
  ];

  const groupInfo = groupName ? ` في (*${groupName}*)` : '';

  const bodies = [
    `📋 تم استلام وتسجيل طلب انضمام الطالب/ة: *${studentName}*${groupInfo} لدى *${centerName}* بنجاح.\n\n⏳ الطلب قيد المراجعة حالياً من قبل المعلم، وسنوافيكم برسالة تأكيد فور اعتماد القبول.`,
    `📋 نود إبلاغكم بوصول طلب حجز وانضمام الطالب/ة: *${studentName}*${groupInfo} إلى *${centerName}*.\n\n⏳ جاري مراجعة الطلب من قبل إدارة السنتر وسنرسل لكم إشعاراً فور التأكيد.`,
  ];

  const greeting = pickRandom(greetings);
  const body = pickRandom(bodies);
  const sig = pickRandom(SIGNATURES);

  const parts = [greeting, '', body];
  if (sig) parts.push('', sig);

  return parts.join('\n');
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
    '📋 منصة الأول التعليمية — نتمنى لك يوماً موفقاً ومثمراً 🌟',
    '✨ فريق الأول — بالتوفيق والنجاح في يومك أستاذنا!',
    '🎓 منصة الأول — يوم تعليمي موفق ومبارك بإذن الله 🌟',
  ];

  const intros = [
    `صباح الخير أستاذ *${teacherName}* 👋\nإليك جدول حصصك ومجموعاتك المجدولة اليوم (*${dateStr}*):`,
    `مرحباً بحضرتك أستاذ *${teacherName}* ☀️\nجدولك ومواعيد الحصص اليوم (*${dateStr}*):`,
    `أستاذ *${teacherName}*، صباح النور والبركة! 🌅\nمواعيد حصصك ومجموعاتك اليوم (*${dateStr}*):`,
  ];

  const intro = pickRandom(intros);
  const sig = pickRandom(sigs);
  const agenda = sessionLines
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

export function formatAssistantCredentialsMessage(data: {
  assistantName: string;
  phone: string;
  password?: string;
  platformUrl?: string;
  isUpdate?: boolean;
}): string {
  const greeting = pickRandom(ASSISTANT_GREETINGS);
  const name = data.assistantName ? `أ/ ${data.assistantName}` : 'المساعد المحترم';
  const actionText = data.isUpdate
    ? 'تم تحديث بيانات حساب المساعد الخاص بك في منصة الأوّل.'
    : 'تم إضافتك كمساعد وسكرتارية في منصة الأوّل.';

  const passLine = data.password ? `\n- 🔑 كلمة المرور: \`${data.password}\`` : (data.isUpdate ? '\n- 🔑 كلمة المرور: (لم تتغير)' : '');
  const url = data.platformUrl || 'https://al-awal.online/login';

  const lines = [
    greeting,
    '',
    `*بيانات حساب المساعد*`,
    '',
    `مرحباً ${name}،`,
    actionText,
    '',
    `📌 *بيانات الدخول:*`,
    `- 📱 الهاتف: \`${data.phone}\`${passLine}`,
    '',
    `🔗 رابط تسجيل الدخول: ${url}`,
    '',
    'نتمنى لك التوفيق دائماً 🌟',
    '— إدارة منصة الأوّل 🎓',
  ];

  return lines.join('\n');
}

