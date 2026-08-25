/**
 * generateCertificate.ts
 * Pure Canvas-API certificate generator — no external dependencies.
 * Produces an A4-landscape PNG data URL for download.
 */

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  teacherName?: string;
  completedDate: string; // e.g. "25 أغسطس 2026"
}

/** Helper: wrap text to multiple lines within a max pixel width */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw a rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw a decorative corner ornament */
function drawCorner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  // Two short lines forming an L-bracket
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size);
  ctx.stroke();

  // Small decorative diamond
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Draw a seal / stamp icon using canvas primitives */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  // Outer starburst ring
  const spikes = 18;
  const outerR = radius;
  const innerR = radius * 0.82;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();

  const sealGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
  sealGrad.addColorStop(0, '#fffde7');
  sealGrad.addColorStop(0.6, '#ffd54f');
  sealGrad.addColorStop(1, '#f9a825');
  ctx.fillStyle = sealGrad;
  ctx.fill();
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Checkmark
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.lineTo(cx - 4, cy + 12);
  ctx.lineTo(cx + 16, cy - 12);
  ctx.stroke();

  ctx.restore();
}

export function generateCertificate(data: CertificateData): string {
  const W = 1122; // A4 landscape @ 96 dpi
  const H = 794;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background gradient ──────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#fffde7');
  bgGrad.addColorStop(0.45, '#fff8e1');
  bgGrad.addColorStop(1, '#fff3e0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle texture dots ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(180,140,60,0.07)';
  for (let x = 20; x < W; x += 40) {
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Outer decorative border ──────────────────────────────────────────────
  const borderPad = 22;
  roundRect(ctx, borderPad, borderPad, W - borderPad * 2, H - borderPad * 2, 14);
  const outerBorderGrad = ctx.createLinearGradient(borderPad, borderPad, W - borderPad, H - borderPad);
  outerBorderGrad.addColorStop(0, '#b8860b');
  outerBorderGrad.addColorStop(0.5, '#ffd700');
  outerBorderGrad.addColorStop(1, '#b8860b');
  ctx.strokeStyle = outerBorderGrad;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // ── Inner border ────────────────────────────────────────────────────────
  const innerPad = 34;
  roundRect(ctx, innerPad, innerPad, W - innerPad * 2, H - innerPad * 2, 10);
  ctx.strokeStyle = 'rgba(184,134,11,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Corner ornaments ────────────────────────────────────────────────────
  const cornerSize = 38;
  const goldColor = '#b8860b';
  const cp = innerPad + 6;
  drawCorner(ctx, cp, cp, 0, cornerSize, goldColor); // top-left
  drawCorner(ctx, W - cp, cp, Math.PI / 2, cornerSize, goldColor); // top-right
  drawCorner(ctx, cp, H - cp, -Math.PI / 2, cornerSize, goldColor); // bottom-left
  drawCorner(ctx, W - cp, H - cp, Math.PI, cornerSize, goldColor); // bottom-right

  // ── Header gold band ────────────────────────────────────────────────────
  const headerY = 58;
  const headerH = 64;
  roundRect(ctx, 58, headerY, W - 116, headerH, 8);
  const headerGrad = ctx.createLinearGradient(58, headerY, W - 58, headerY + headerH);
  headerGrad.addColorStop(0, '#795548');
  headerGrad.addColorStop(0.2, '#b8860b');
  headerGrad.addColorStop(0.5, '#ffd700');
  headerGrad.addColorStop(0.8, '#b8860b');
  headerGrad.addColorStop(1, '#795548');
  ctx.fillStyle = headerGrad;
  ctx.fill();

  // Platform name in header
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8e1';
  ctx.font = `bold 26px 'Segoe UI', 'Arial', sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.fillText('منصة الأول للتعليم', W / 2, headerY + 41);
  ctx.restore();

  // ── Main title: شهادة إتمام ──────────────────────────────────────────────
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  ctx.font = `bold 52px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#4e342e';
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 6;
  ctx.fillText('شهادة إتمام', W / 2, 195);
  ctx.restore();

  // Subtitle line under title
  const lineY = 208;
  const lineHalfW = 180;
  const lineGrad = ctx.createLinearGradient(W / 2 - lineHalfW, lineY, W / 2 + lineHalfW, lineY);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, '#b8860b');
  lineGrad.addColorStop(0.7, '#b8860b');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - lineHalfW, lineY);
  ctx.lineTo(W / 2 + lineHalfW, lineY);
  ctx.stroke();

  // ── "يُشهد لـ" label ─────────────────────────────────────────────────────
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `18px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#6d4c41';
  ctx.fillText('يُشهد لـ', W / 2, 248);
  ctx.restore();

  // ── Student name ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `bold 44px 'Segoe UI', 'Arial', sans-serif`;

  // Name gradient
  const nameGrad = ctx.createLinearGradient(W / 2 - 250, 0, W / 2 + 250, 0);
  nameGrad.addColorStop(0, '#b8860b');
  nameGrad.addColorStop(0.5, '#7b3f00');
  nameGrad.addColorStop(1, '#b8860b');
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = 'rgba(184,134,11,0.25)';
  ctx.shadowBlur = 8;

  // Wrap name if too long
  const nameLines = wrapText(ctx, data.studentName, W - 240);
  nameLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 300 + i * 52);
  });
  ctx.restore();

  const afterNameY = 300 + nameLines.length * 52;

  // Decorative line under name
  const nameLine2Y = afterNameY + 4;
  ctx.strokeStyle = 'rgba(184,134,11,0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, nameLine2Y);
  ctx.lineTo(W / 2 + 200, nameLine2Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── "بإتمامه/ها دورة" label ──────────────────────────────────────────────
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `18px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#6d4c41';
  ctx.fillText('بإتمامه/ها الدورة التدريبية بنجاح', W / 2, afterNameY + 38);
  ctx.restore();

  // ── Course title ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `bold 30px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#1a237e';
  ctx.shadowColor = 'rgba(26,35,126,0.15)';
  ctx.shadowBlur = 6;

  const courseLines = wrapText(ctx, `" ${data.courseTitle} "`, W - 300);
  courseLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, afterNameY + 80 + i * 38);
  });
  ctx.restore();

  const afterCourseY = afterNameY + 80 + courseLines.length * 38;

  // ── Teacher name ─────────────────────────────────────────────────────────
  if (data.teacherName) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.font = `16px 'Segoe UI', 'Arial', sans-serif`;
    ctx.fillStyle = '#555';
    ctx.fillText(`بإشراف الأستاذ/ة: ${data.teacherName}`, W / 2, afterCourseY + 12);
    ctx.restore();
  }

  // ── Footer bar ───────────────────────────────────────────────────────────
  const footerY = H - 90;
  const footerGrad = ctx.createLinearGradient(58, footerY, W - 58, footerY + 50);
  footerGrad.addColorStop(0, 'rgba(184,134,11,0.08)');
  footerGrad.addColorStop(0.5, 'rgba(184,134,11,0.18)');
  footerGrad.addColorStop(1, 'rgba(184,134,11,0.08)');
  roundRect(ctx, 58, footerY, W - 116, 50, 8);
  ctx.fillStyle = footerGrad;
  ctx.fill();

  // Date (right side of footer)
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `15px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#5d4037';
  ctx.fillText(`تاريخ الإتمام: ${data.completedDate}`, W - 80, footerY + 30);
  ctx.restore();

  // "Issued by" (left side of footer)
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = `14px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = '#5d4037';
  ctx.fillText('al-awal.online', 80, footerY + 30);
  ctx.restore();

  // ── Seal (bottom center-right area) ─────────────────────────────────────
  drawSeal(ctx, W - 140, H - 145, 52);

  return canvas.toDataURL('image/png');
}

/** Trigger a browser download of the certificate PNG */
export function downloadCertificate(data: CertificateData): void {
  const dataUrl = generateCertificate(data);
  const a = document.createElement('a');
  a.href = dataUrl;
  const safeName = data.studentName.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  const safeCourse = data.courseTitle.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  a.download = `شهادة_${safeName}_${safeCourse}.png`;
  a.click();
}
