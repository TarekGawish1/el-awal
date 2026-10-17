import { Injectable } from '@nestjs/common';
import { formatPaymentReceivedMessage } from '../../../utils/spintax';

@Injectable()
export class NotificationTemplatesService {
  /**
   * Builds Arabic student absence notification text.
   */
  formatAbsenceMessage(studentName: string, groupName?: string, date?: Date): string {
    const dateStr = (date || new Date()).toISOString().split('T')[0];
    const groupText = groupName ? `في مجموعة (${groupName})` : '';
    return `نود إحاطتكم بغياب الطالب/ة (${studentName}) ${groupText} عن حصة الرياضيات مع أستاذ أحمد غريب بتاريخ ${dateStr}. يرجى المتابعة مع المدرس.\n\nمنصة الأول للرياضيات - أستاذ أحمد غريب 📐`;
  }

  /**
   * Builds Arabic student absence apology / attendance confirmation text.
   */
  formatAbsenceApologyMessage(studentName: string, groupName?: string, date?: Date): string {
    const group = groupName || 'الحصة';
    return `نعتذر لحضرتكم عن إشعار الغياب السابق؛ نود إحاطتكم بأن الطالب/ة: (${studentName}) قد حضر بالفعل حصة الرياضيات مع أستاذ أحمد غريب في مجموعة (${group}) وتم رصد حضوره بنجاح.\n\nمنصة الأول للرياضيات - أستاذ أحمد غريب 📐`;
  }

  /**
   * Builds Arabic missing homework alert message.
   */
  formatMissingHomeworkMessage(studentName: string, assessmentTitle: string, groupName?: string, date?: Date): string {
    const dateStr = (date || new Date()).toISOString().split('T')[0];
    const groupText = groupName ? `في مجموعة (${groupName})` : '';
    return `نود إحاطتكم بأن الطالب (${studentName}) لم يقم بتسليم الواجب (${assessmentTitle}) ${groupText} بتاريخ ${dateStr}. يرجى المتابعة والحرص على أداء الواجبات.`;
  }

  /**
   * Builds Arabic repeated lateness alert message.
   */
  formatRepeatedLatenessMessage(studentName: string, groupName: string): string {
    return `نود إحاطتكم بأن الطالب (${studentName}) يتأخر بشكل متكرر عن موعد حصص مجموعة (${groupName}) (3 مرات متتالية). يرجى التأكيد على الحضور في الموعد المحدد لضمان تحقيق أقصى استفادة.`;
  }

  /**
   * Builds Arabic assessment graded message.
   */
  formatAssessmentGradedMessage(studentName: string, assessmentTitle: string, scoreDisplay: string): string {
    return `تم رصد درجات (${assessmentTitle}) للطالب ${studentName}. النتيجة: ${scoreDisplay}`;
  }

  /**
   * Builds Arabic formatted payment receipt message using spintax engine.
   */
  formatPaymentReceived(params: {
    parentName: string;
    studentName: string;
    amount: number;
    currency: string;
    paymentType: string;
    invoiceNumber?: string;
    paymentMethod: string;
    remainingBalance: number;
  }): string {
    return formatPaymentReceivedMessage(params);
  }
}
