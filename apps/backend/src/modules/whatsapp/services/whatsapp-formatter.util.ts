import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { renderSpintax } from '../../../utils/spintax';

export interface QueueNotification {
  type: string;
  notificationType?: string;
  title: string;
  body?: string;
  message?: string;
  recipient: {
    fullName: string;
    role: UserRole;
  };
  scheduledFor: Date;
  data?: unknown;
}

export function formatToWhatsAppInternational(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('01') && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith('201') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return `20${digits}`;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  throw new BadRequestException('Invalid Egyptian international phone number');
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'مساءً' : 'صباحاً';
  const hour12 = h % 12 || 12;
  const minuteStr = m ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour12}${minuteStr} ${period}`;
}

export function buildMessageBody(notification: QueueNotification): string {
  const data = (notification.data || {}) as Record<string, unknown>;
  const textContent = notification.body || notification.message || '';
  const baseBody = textContent ? `${notification.title}\n\n${textContent}` : notification.title;

  switch (notification.notificationType ?? notification.type) {
    case 'STUDENT_APPROVAL_CREDENTIALS': {
      return textContent;
    }
    case 'STUDENT_ABSENCE_PARENT': {
      const studentName = String(data.studentName || 'ابنكم/ابنتكم');
      const groupName = String(data.groupName || 'المجموعة الدراسية');
      const sessionDate = String(data.sessionDate || '');
      return renderSpintax(
        `{السلام عليكم ورحمة الله وبركاته|تحية طيبة وبعد|أهلاً بحضرتك يا فندم} 🌸\n\n` +
        `نحيط سيادتكم علماً بأن الطالب/ة *${studentName}* قد {تغيب/ت|لم يحضر|سُجل غياباً} اليوم عن حصة *${groupName}*${sessionDate ? ` بتاريخ ${sessionDate}` : ''}.\n\n` +
        `حرصاً على مستواه/ا الدراسي، يُرجى المتابعة والتأكد من استدراك ما فاته/ا.\n\n` +
        `{مع تحيات إدارة المنصة التعليمية|دمتم بخير وتوفيق|شاكرين حسن تعاونكم وحرصكم الكريم} 🌟`,
      );
    }
    case 'ATTENDANCE_RECORDED': {
      const studentName = String(data.studentName || 'ابنكم/ابنتكم');
      const groupName = String(data.groupName || 'المجموعة الدراسية');
      const status = String(data.status || 'PRESENT');
      const sessionDate = String(data.sessionDate || '');
      const statusText =
        status === 'PRESENT'
          ? '{حضر|تم تسجيل حضوره بنجاح}'
          : status === 'LATE'
          ? '{حضر متأخراً|سُجل تأخير}'
          : '{تغيب|لم يحضر}';
      return renderSpintax(
        `{السلام عليكم ورحمة الله|مرحباً بحضرتك|تحياتنا الطيبة} 🌸\n\n` +
        `نود إعلامكم بأن الطالب/ة *${studentName}* قد ${statusText} اليوم في حصة *${groupName}*${sessionDate ? ` (${sessionDate})` : ''}.\n\n` +
        `{شاكرين تعاونكم المستمر معنا|مع تمنياتنا بالتفوق والنجاح الدائم|دمتم في حفظ الله ورعايته} ✨`,
      );
    }
    case 'HOMEWORK_SUBMITTED': {
      const studentName = String(data.studentName || 'الطالب');
      const assignmentTitle = String(data.assignmentTitle || 'الواجب');
      const groupName = String(data.groupName || '');
      return renderSpintax(
        `{تم بحمد الله|نحيطكم علماً|بشرى سارة} 📝\n\n` +
        `قام الطالب/ة *${studentName}* {بتسليم|بإنجاز|بإرسال} الواجب: *${assignmentTitle}*${groupName ? ` في ${groupName}` : ''} بنجاح.\n\n` +
        `{فخورون بالتزامه وحرصه على التعلم|بارك الله في جهوده وجهودكم المباركة} 🌟`,
      );
    }
    case 'ASSESSMENT_GRADED': {
      const studentName = String(data.studentName || 'الطالب');
      const assessmentTitle = String(data.assessmentTitle || 'التقييم');
      const score = data.score ?? '';
      const totalScore = data.totalScore ?? '';
      const scoreStr = score !== '' && totalScore !== '' ? ` وحصل على درجة *${score}/${totalScore}*` : '';
      return renderSpintax(
        `{السلام عليكم ورحمة الله|تحياتنا الطيبة والتقدير} 🎓\n\n` +
        `تم {تصحيح|رصد درجة} اختبار الطالب/ة *${studentName}* في *${assessmentTitle}*${scoreStr}.\n\n` +
        `يمكنكم الاطلاع على تقرير الأداء والتفاصيل كاملة عبر المنصة.\n\n` +
        `{نسأل الله له/ا دوام التفوق والسداد|مع تحيات إدارة التدريس والتعليم} 🌟`,
      );
    }
    case 'TEACHER_DAILY_SCHEDULE': {
      return textContent || baseBody;
    }
    case 'TEACHER_SESSION_REMINDER': {
      const groupName = String(data.groupName || 'المجموعة الدراسية');
      const timeStr = formatTime(String(data.startTime || ''));
      return renderSpintax(
        `{تذكير بموعد الحصة|موعد حصتكم القادمة|حصة قريبة} 🔔\n\n` +
        `حصة مجموعة *${groupName}* تبدأ الساعة *${timeStr}* اليوم.\n\n` +
        `الرجاء الاستعداد والتواجد في الموعد المحدد. بالتوفيق! 🌟`,
      );
    }
    default:
      return renderSpintax(baseBody);
  }
}
