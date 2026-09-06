import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ArabicShaper } = require('arabic-persian-reshaper');
import * as path from 'path';
import * as fs from 'fs';

export interface GroupPdfStudentData {
  id: string;
  fullName: string;
  studentCode: string;
  qrCodeToken?: string;
  phone?: string;
  parentPhone?: string;
}

@Injectable()
export class GroupPdfService {
  private cairoFontPath: string | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.resolveFontPath();
  }

  private resolveFontPath(): void {
    const candidatePaths = [
      path.join(__dirname, '../../../assets/fonts/Cairo.ttf'),
      path.join(__dirname, '../../assets/fonts/Cairo.ttf'),
      path.join(__dirname, '../assets/fonts/Cairo.ttf'),
      path.join(process.cwd(), 'apps/backend/src/assets/fonts/Cairo.ttf'),
      path.join(process.cwd(), 'src/assets/fonts/Cairo.ttf'),
      path.join(process.cwd(), 'dist/assets/fonts/Cairo.ttf'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        this.cairoFontPath = p;
        break;
      }
    }
  }

  /**
   * Reshape and reverse Arabic text tokens for correct Right-To-Left presentation in PDFKit.
   */
  public formatArabicRTL(text: string): string {
    if (!text) return '';
    try {
      const reshaped = ArabicShaper.convertArabic(text);
      const words = reshaped.split(' ');
      const processed = words.map((w: string) => {
        if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(w)) {
          return w.split('').reverse().join('');
        }
        return w;
      });
      return processed.reverse().join(' ');
    } catch {
      return text;
    }
  }

  /**
   * Generates a printable A4 PDF containing high-resolution QR code cards for all active students in a study group.
   * Format: Standard A4 Portrait, 6 to 8 cards per page with cutting dashed lines.
   */
  async generateGroupQRCodesPdf(
    groupId: string,
    teacherId: string,
    userRole?: string,
  ): Promise<Buffer> {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        teacher: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('المجموعة الدراسية غير موجودة.');
    }

    // Access control: only owner teacher or secretariat/admin can generate PDF
    if (userRole !== 'SECRETARIAT' && userRole !== 'SUPER_ADMIN' && group.teacherId !== teacherId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذه المجموعة.');
    }

    const enrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                fullName: true,
                phone: true,
              },
            },
            parentLinks: {
              include: {
                parent: {
                  include: {
                    user: {
                      select: {
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          user: {
            fullName: 'asc',
          },
        },
      },
    });

    const students: GroupPdfStudentData[] = (enrollments as any[]).map((e) => {
      const parentPhone = e.student?.parentLinks?.[0]?.parent?.user?.phone || e.student?.emergencyPhone;
      return {
        id: e.student?.id || e.studentId,
        fullName: e.student?.user?.fullName || 'طالب غير معروف',
        studentCode: e.student?.studentCode || `STU-${(e.student?.id || e.studentId || '').slice(0, 8).toUpperCase()}`,
        qrCodeToken: e.student?.qrCodeToken,
        phone: e.student?.user?.phone || undefined,
        parentPhone: parentPhone || undefined,
      };
    });

    return this.buildPdfDocument({
      groupName: group.name,
      gradeLevel: group.gradeLevel,
      teacherName: group.teacher?.user?.fullName || 'الأستاذ',
      students,
    });
  }

  /**
   * Builds the PDFKit document buffer with 8 cards per A4 page.
   */
  public async buildPdfDocument(data: {
    groupName: string;
    gradeLevel: string;
    teacherName: string;
    students: GroupPdfStudentData[];
  }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4', // 595.28 x 841.89
          margins: { top: 25, bottom: 25, left: 25, right: 25 },
          autoFirstPage: true,
          info: {
            Title: `كروت QR - ${data.groupName}`,
            Author: 'منصة الأول التعليمية',
            Subject: 'Bulk Student QR Badges',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Register Arabic font if available
        if (this.cairoFontPath && fs.existsSync(this.cairoFontPath)) {
          doc.registerFont('Cairo', this.cairoFontPath);
          doc.font('Cairo');
        }

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const marginX = 25;
        const marginY = 25;
        const gapX = 14;
        const gapY = 12;

        const cols = 2;
        const rows = 4; // 8 cards per page
        const cardsPerPage = cols * rows;

        const cardWidth = (pageWidth - marginX * 2 - gapX * (cols - 1)) / cols; // ~260.6 pt
        const cardHeight = (pageHeight - marginY * 2 - gapY * (rows - 1)) / rows; // ~188.9 pt

        if (data.students.length === 0) {
          // Render empty state page
          doc.fontSize(16).fillColor('#1e293b');
          const emptyText = this.formatArabicRTL('لا يوجد طلاب مسجلون حالياً في هذه المجموعة');
          const grpText = this.formatArabicRTL(`المجموعة: ${data.groupName}`);
          doc.text(grpText, marginX, marginY + 40, { align: 'center', width: pageWidth - marginX * 2 });
          doc.fontSize(13).fillColor('#64748b');
          doc.text(emptyText, marginX, marginY + 70, { align: 'center', width: pageWidth - marginX * 2 });
          doc.end();
          return;
        }

        // Pre-generate all QR buffers in parallel for ultra-fast PDF generation
        const qrBuffers = await Promise.all(
          data.students.map((student) => {
            const qrPayload = student.studentCode || student.qrCodeToken || student.id;
            return QRCode.toBuffer(qrPayload, {
              type: 'png',
              errorCorrectionLevel: 'H',
              margin: 1,
              width: 256,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
          }),
        );

        for (let i = 0; i < data.students.length; i++) {
          const student = data.students[i];
          const qrPngBuffer = qrBuffers[i];
          const pageIndex = i % cardsPerPage;

          if (i > 0 && pageIndex === 0) {
            doc.addPage();
            if (this.cairoFontPath && fs.existsSync(this.cairoFontPath)) {
              doc.font('Cairo');
            }
          }

          const col = pageIndex % cols;
          const row = Math.floor(pageIndex / cols);

          const x = marginX + col * (cardWidth + gapX);
          const y = marginY + row * (cardHeight + gapY);

          this.renderCard(doc, {
            x,
            y,
            width: cardWidth,
            height: cardHeight,
            groupName: data.groupName,
            gradeLevel: data.gradeLevel,
            teacherName: data.teacherName,
            student,
            qrPngBuffer,
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Renders an individual student card inside the specified bounding box.
   */
  private renderCard(
    doc: any,
    opts: {
      x: number;
      y: number;
      width: number;
      height: number;
      groupName: string;
      gradeLevel: string;
      teacherName: string;
      student: GroupPdfStudentData;
      qrPngBuffer: Buffer;
    },
  ): void {
    const { x, y, width, height, groupName, gradeLevel, student, qrPngBuffer } = opts;

    // 1. Subtle dashed cutting border around each card
    doc.save();
    doc.roundedRect(x, y, width, height, 6);
    doc.lineWidth(0.8);
    doc.dash(3, { space: 2.5 });
    doc.strokeColor('#cbd5e1');
    doc.stroke();
    doc.restore();

    // 2. Group Header Badge Banner (top ~22 pt)
    const headerHeight = 22;
    doc.save();
    doc.roundedRect(x + 1, y + 1, width - 2, headerHeight, 5);
    doc.fillColor('#f8fafc');
    doc.fill();

    doc.moveTo(x + 1, y + headerHeight + 1);
    doc.lineTo(x + width - 1, y + headerHeight + 1);
    doc.lineWidth(0.5);
    doc.undash();
    doc.strokeColor('#e2e8f0');
    doc.stroke();
    doc.restore();

    // Header badge text: Group name & Grade level
    const headerText = this.formatArabicRTL(`${groupName} • ${gradeLevel}`);
    doc.save();
    doc.fontSize(8);
    doc.fillColor('#334155');
    doc.text(headerText, x + 6, y + 6, {
      width: width - 12,
      align: 'center',
      lineBreak: false,
      ellipsis: true,
    });
    doc.restore();

    // 3. Sharp high-contrast QR code
    const qrSize = 84; // ~30mm, instant camera focus
    const qrX = x + (width - qrSize) / 2;
    const qrY = y + headerHeight + 7;

    doc.image(qrPngBuffer, qrX, qrY, {
      width: qrSize,
      height: qrSize,
    });

    // 4. Student Full Name beneath QR Code
    const nameY = qrY + qrSize + 4;
    const arabicName = this.formatArabicRTL(student.fullName);
    doc.save();
    doc.fontSize(11.5);
    doc.fillColor('#0f172a');
    doc.text(arabicName, x + 4, nameY, {
      width: width - 8,
      align: 'center',
      lineBreak: false,
      ellipsis: true,
    });
    doc.restore();

    // 5. Student Code (Monospaced style)
    const codeY = nameY + 15;
    doc.save();
    doc.fontSize(9);
    doc.fillColor('#2563eb');
    doc.text(student.studentCode, x + 4, codeY, {
      width: width - 8,
      align: 'center',
      characterSpacing: 0.5,
    });
    doc.restore();

    // 6. Optional contact phone (Student / Parent)
    const contactPhone = student.phone || student.parentPhone;
    if (contactPhone) {
      const phoneY = codeY + 13;
      const phoneLabel = student.phone ? 'هاتف' : 'ولي الأمر';
      const phoneText = this.formatArabicRTL(`${contactPhone} :${phoneLabel}`);
      doc.save();
      doc.fontSize(7.5);
      doc.fillColor('#64748b');
      doc.text(phoneText, x + 4, phoneY, {
        width: width - 8,
        align: 'center',
      });
      doc.restore();
    }
  }
}
