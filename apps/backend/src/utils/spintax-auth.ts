import { pickRandom, SIGNATURES } from './spintax';

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

function sanitizePassword(password?: string): string {
  if (!password || typeof password !== 'string') return '';
  const trimmed = password.trim();
  if (!trimmed) return '';
  // Reject placeholder phrases with whitespace or explicit placeholder keywords
  if (/\s/.test(trimmed) || /كلمة\s*المرور|placeholder|undefined|null/i.test(trimmed)) {
    return '';
  }
  return trimmed;
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
    centerName = 'منصة الأول للرياضيات - أستاذ أحمد غريب',
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
  const cleanParentPass = sanitizePassword(parentPassword);
  const cleanStudentPass = sanitizePassword(studentPassword);
  const parentDirectAccessUrl = `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}`;

  const studentCreds = `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`${displayStudentPhone}\`
- كلمة المرور: \`${cleanStudentPass || studentPassword || 'كلمة المرور المحددة للطالب'}\`
🔗 رابط دخول الطالب: ${baseUrl}/login`;

  const displayParentPass = cleanParentPass || cleanStudentPass || '';
  const parentCreds = `📌 *بوابة ولي الأمر (لمتابعة الحضور، الغياب، والدرجات):*
- يمكن لولي الأمر الدخول لمتابعة الحضور والدرجات عبر الرابط التالي:
🔗 رابط دخول ولي الأمر:
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
    centerName = 'منصة الأول للرياضيات - أستاذ أحمد غريب',
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
  const cleanParentPass = sanitizePassword(parentPassword);
  const cleanStudentPass = sanitizePassword(studentPassword);
  const parentDirectAccessUrl = `${baseUrl}/parent-access?phone=${encodeURIComponent(directPhone)}`;

  const studentCreds = `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`${displayStudentPhone}\`
- كلمة المرور: \`${cleanStudentPass || studentPassword || 'كلمة المرور الخاصة بالطالب'}\`
🔗 رابط دخول الطالب: ${baseUrl}/login`;

  const displayParentPass = cleanParentPass || cleanStudentPass || '';
  const parentCreds = `📌 *بوابة ولي الأمر (لمتابعة الحضور، الغياب، والدرجات):*
- يمكن لولي الأمر الدخول لمتابعة الحضور والدرجات عبر الرابط التالي:
🔗 رابط دخول ولي الأمر:
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
    centerName = 'منصة الأول للرياضيات - أستاذ أحمد غريب',
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

export function formatAssistantCredentialsMessage(data: {
  assistantName: string;
  phone: string;
  password?: string;
  platformUrl?: string;
  isUpdate?: boolean;
}): string {
  const greetings = [
    'السلام عليكم ورحمة الله وبركاته،',
    'تحية طيبة وبعد، أ/ المساعد المحترم،',
    'أهلاً وسهلاً بحضرتك،',
    'مساء الخير / صباح الخير،',
  ];
  const greeting = pickRandom(greetings);
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
    '— منصة الأول للرياضيات - أستاذ أحمد غريب 📐',
  ];

  return lines.join('\n');
}

/**
 * Generates an anti-ban WhatsApp message with 6-digit OTP code for quick login.
 */
export function formatLoginOtpMessage(data: {
  name?: string;
  code: string;
  expiresInMinutes?: number;
}): string {
  const greetings = [
    'السلام عليكم ورحمة الله وبركاته،',
    'أهلاً وسهلاً بك،',
    'مرحباً بك،',
    'تحية طيبة وبعد،',
  ];
  const greeting = pickRandom(greetings);
  const sig = pickRandom(SIGNATURES);
  const expiry = data.expiresInMinutes || 5;
  const nameLine = data.name ? `عزيزنا/ *${data.name}*،\n` : '';

  const bodies = [
    `${nameLine}رمز التحقق لتسجيل الدخول السريع إلى حسابك هو:\n\n*${data.code}*\n\n⏱️ هذا الرمز صالح لمدة ${expiry} دقائق فقط للاستخدام لمرة واحدة.\n🔒 لأمان حسابك، لا تشارك هذا الرمز مع أي شخص.`,
    `${nameLine}كود الدخول المباشر إلى منصة الأوّل التعليمية هو:\n\n*${data.code}*\n\n⏱️ ينتهي هذا الرمز خلال ${expiry} دقائق.\n🛡️ احرص على سرية هذا الرمز ولا تفصح عنه لأحد.`,
    `${nameLine}طلب تسجيل الدخول عبر واتساب لمنصة الأوّل:\n\nرمز التحقق: *${data.code}*\n\n⏱️ صالح لمدة ${expiry} دقائق.\n⚠️ تنبيه أمني: لا تعطي هذا الرمز لأي طرف آخر.`,
  ];

  const body = pickRandom(bodies);
  return `${greeting}\n\n${body}\n\n${sig}`;
}

/**
 * Generates an anti-ban WhatsApp message with a secure password reset link.
 */
export function formatPasswordResetMessage(data: {
  name?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): string {
  const greetings = [
    'السلام عليكم ورحمة الله وبركاته،',
    'أهلاً وسهلاً بك،',
    'تحية طيبة وبعد،',
  ];
  const greeting = pickRandom(greetings);
  const sig = pickRandom(SIGNATURES);
  const expiry = data.expiresInMinutes || 15;
  const nameLine = data.name ? `عزيزنا/ *${data.name}*،\n` : '';

  const bodies = [
    `${nameLine}تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في منصة الأوّل التعليمية.\n\n🔗 يمكنك تعيين كلمة المرور الجديدة عبر الرابط التالي:\n${data.resetUrl}\n\n⏱️ هذا الرابط صالح لمدة ${expiry} دقيقة فقط وللاستخدام لمرة واحدة.\n⚠️ إذا لم تقم بطلب تغيير كلمة المرور، يرجى تجاهل هذه الرسالة فلن يتغير أي شيء بحسابك.`,
    `${nameLine}رابط استعادة وتعيين كلمة المرور الجديدة لحسابك:\n\n${data.resetUrl}\n\n⏱️ ينتهي مفعول هذا الرابط خلال ${expiry} دقيقة.\n🔒 حرصاً على أمانك، لا تشارك هذا الرابط مع أحد.\n(إذا لم تكن أنت صاحب هذا الطلب يمكنك تجاهل الرسالة بأمان)`,
  ];

  const body = pickRandom(bodies);
  return `${greeting}\n\n${body}\n\n${sig}`;
}
