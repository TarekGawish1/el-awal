export function formatResetStudentPasswordMessage(params: {
  parentName: string;
  studentName: string;
  studentCode: string;
  teacherName: string;
  studentPhone: string;
  newPassword: string;
}): string {
  return `🔑 *إشعار تحديث بيانات الدخول - منصة الأوّل*

أهلاً بحضرتك أ/ ${params.parentName}،
تم تحديث كلمة المرور الخاصة بالطالب/ة: *${params.studentName}* (${params.studentCode}) مع *${params.teacherName}*.

━━━━━━━━━━━━━━━━━━━
📌 *بيانات الدخول المحدثة:*
▫️ *كود الطالب:* ${params.studentCode}
▫️ *رقم الدخول / الهاتف:* ${params.studentPhone}
▫️ *كلمة المرور الجديدة:* ${params.newPassword}
🔗 *رابط تسجيل الدخول:* https://al-awal.online/login
━━━━━━━━━━━━━━━━━━━
يمكنكم الدخول ومتابعة الحساب في أي وقت. بالتوفيق والنجاح! 🌟`.trim();
}

export function formatResetParentPasswordMessage(params: {
  parentName: string;
  studentName: string;
  studentCode: string;
  teacherName: string;
  parentPhone: string;
  newPassword: string;
  directLoginUrl: string;
}): string {
  return `🔐 *إشعار تحديث بيانات دخول ولي الأمر - منصة الأول للرياضيات*

أهلاً بحضرتك أ/ ${params.parentName}،
تم تحديث كلمة المرور الخاصة بحساب ولي الأمر لمتابعة الطالب/ة: *${params.studentName}* (${params.studentCode}) مع *${params.teacherName}*.

━━━━━━━━━━━━━━━━━━━
📌 *بيانات دخول ولي الأمر:*
▫️ *رقم الدخول / الهاتف:* ${params.parentPhone}
▫️ *أو كود الطالب:* ${params.studentCode}
▫️ *كلمة مرور ولي الأمر:* ${params.newPassword}
🔗 *رابط الدخول المباشر:* ${params.directLoginUrl}
━━━━━━━━━━━━━━━━━━━
يمكنكم الدخول عبر الرابط المباشر أعلاه دون الحاجة لكتابة البيانات، أو إدخال رقم هاتفك وكلمة المرور في صفحة دخول أولياء الأمور لمتابعة الحضور، الدرجات، والواجبات في أي وقت. بالتوفيق والنجاح! 🌟

منصة الأول للرياضيات - أستاذ أحمد غريب 📐`.trim();
}

export async function dispatchResetStudentPasswordAlert(
  notificationsService: any,
  params: {
    recipientId: string;
    parentPhone: string;
    studentName: string;
    studentCode: string;
    studentPhone: string;
    newPassword: string;
    teacherName: string;
    message: string;
  },
) {
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online';
  await notificationsService.sendNotification({
    recipientId: params.recipientId,
    type: 'PASSWORD_RESET_ALERT',
    notificationType: 'STUDENT_APPROVAL_CREDENTIALS',
    title: `🔑 تم تحديث كلمة المرور للطالب ${params.studentName}`,
    body: params.message,
    channels: ['WHATSAPP', 'IN_APP'],
    data: {
      phone: params.parentPhone,
      studentName: params.studentName,
      studentCode: params.studentCode,
      studentPhoneOrCode: params.studentPhone,
      studentPassword: params.newPassword,
      parentPhone: params.parentPhone,
      parentName: params.teacherName,
      centerName: params.teacherName,
      platformUrl,
    },
  });
}

export async function dispatchResetParentPasswordAlert(
  notificationsService: any,
  params: {
    recipientId: string;
    parentPhone: string;
    studentName: string;
    studentCode: string;
    parentName: string;
    newPassword: string;
    teacherName: string;
    directLoginUrl: string;
    message: string;
  },
) {
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online';
  await notificationsService.sendNotification({
    recipientId: params.recipientId,
    type: 'PARENT_PASSWORD_RESET_ALERT',
    notificationType: 'STUDENT_APPROVAL_CREDENTIALS',
    title: `🔐 تم تحديث كلمة المرور لحساب ولي أمر ${params.studentName}`,
    body: params.message,
    channels: ['WHATSAPP', 'IN_APP'],
    data: {
      phone: params.parentPhone,
      studentName: params.studentName,
      studentCode: params.studentCode,
      parentPhone: params.parentPhone,
      parentName: params.parentName,
      parentPassword: params.newPassword,
      directLoginUrl: params.directLoginUrl,
      centerName: params.teacherName,
      platformUrl,
    },
  });
}

