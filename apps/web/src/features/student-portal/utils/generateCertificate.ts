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

// ─── Certificate Number ────────────────────────────────────────────────────

/**
 * Generates a deterministic, unique-looking certificate number from the
 * student name + course title + date. The same inputs always produce the same
 * number so re-downloads are consistent.
 * Format: CERT-YYYY-XXXXXXXX  (e.g. CERT-2026-A3F7B2C1)
 */
export function generateCertificateNumber(data: CertificateData): string {
  const seed = `${data.studentName}||${data.courseTitle}||${data.completedDate}`;

  // FNV-1a 32-bit hash — fast, no crypto needed
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = (Math.imul(hash, 0x01000193) >>> 0);
  }

  // Convert to uppercase hex, zero-pad to 8 chars
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');

  const year = new Date().getFullYear();
  return `CERT-${year}-${hex}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size);
  ctx.stroke();

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

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 1.2;
  ctx.stroke();

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

/**
 * Draws the platform badge (graduation-cap favicon style) as a blue rounded
 * square, scaled from the 512x512 SVG viewBox to `size` px.
 */
function drawPlatformBadge(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  size: number,
) {
  ctx.save();

  const r = size * 0.20;

  // White halo border
  roundRect(ctx, bx - 3, by - 3, size + 6, size + 6, r + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Blue gradient background
  roundRect(ctx, bx, by, size, size, r);
  const bgG = ctx.createLinearGradient(bx, by, bx + size, by + size);
  bgG.addColorStop(0, '#3366FF');
  bgG.addColorStop(0.5, '#1E4BD9');
  bgG.addColorStop(1, '#0B1E63');
  ctx.fillStyle = bgG;
  ctx.fill();

  // Inner subtle ring
  roundRect(ctx, bx + 3, by + 3, size - 6, size - 6, r - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Scale factor: SVG is 512x512
  const sc = size / 512;
  const tx = bx;
  const ty = by + 10 * sc;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.30)';
  ctx.shadowBlur = 12 * sc;
  ctx.shadowOffsetY = 10 * sc;

  // Cap diamond top
  const capGrad = ctx.createLinearGradient(tx + 96 * sc, ty + 120 * sc, tx + 416 * sc, ty + 270 * sc);
  capGrad.addColorStop(0, '#FFFFFF');
  capGrad.addColorStop(1, '#E2E8F0');
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.moveTo(tx + 256 * sc, ty + 120 * sc);
  ctx.lineTo(tx + 416 * sc, ty + 195 * sc);
  ctx.lineTo(tx + 256 * sc, ty + 270 * sc);
  ctx.lineTo(tx + 96 * sc,  ty + 195 * sc);
  ctx.closePath();
  ctx.fill();

  // Cap body
  ctx.fillStyle = '#E2E8F0';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(tx + 160 * sc, ty + 228 * sc);
  ctx.lineTo(tx + 160 * sc, ty + 300 * sc);
  ctx.bezierCurveTo(
    tx + 160 * sc, ty + 345 * sc,
    tx + 352 * sc, ty + 345 * sc,
    tx + 352 * sc, ty + 300 * sc,
  );
  ctx.lineTo(tx + 352 * sc, ty + 228 * sc);
  ctx.bezierCurveTo(
    tx + 322 * sc, ty + 248 * sc,
    tx + 289 * sc, ty + 258 * sc,
    tx + 256 * sc, ty + 258 * sc,
  );
  ctx.bezierCurveTo(
    tx + 223 * sc, ty + 258 * sc,
    tx + 190 * sc, ty + 248 * sc,
    tx + 160 * sc, ty + 228 * sc,
  );
  ctx.fill();
  ctx.globalAlpha = 1;

  // Tassel
  const tasselGrad = ctx.createLinearGradient(tx + 256 * sc, ty + 200 * sc, tx + 382 * sc, ty + 340 * sc);
  tasselGrad.addColorStop(0, '#FDE68A');
  tasselGrad.addColorStop(1, '#F59E0B');
  ctx.strokeStyle = tasselGrad;
  ctx.lineWidth = 9 * sc;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(tx + 256 * sc, ty + 200 * sc);
  ctx.quadraticCurveTo(tx + 370 * sc, ty + 215 * sc, tx + 375 * sc, ty + 290 * sc);
  ctx.stroke();

  ctx.fillStyle = tasselGrad;
  ctx.beginPath();
  ctx.moveTo(tx + 368 * sc, ty + 290 * sc);
  ctx.lineTo(tx + 382 * sc, ty + 290 * sc);
  ctx.lineTo(tx + 388 * sc, ty + 340 * sc);
  ctx.lineTo(tx + 362 * sc, ty + 340 * sc);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(tx + 375 * sc, ty + 290 * sc, 7 * sc, 0, Math.PI * 2);
  ctx.fillStyle = '#F59E0B';
  ctx.fill();

  // Open book
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.beginPath();
  ctx.moveTo(tx + 170 * sc, ty + 355 * sc);
  ctx.bezierCurveTo(tx + 215 * sc, ty + 340 * sc, tx + 250 * sc, ty + 355 * sc, tx + 256 * sc, ty + 360 * sc);
  ctx.bezierCurveTo(tx + 262 * sc, ty + 355 * sc, tx + 297 * sc, ty + 340 * sc, tx + 342 * sc, ty + 355 * sc);
  ctx.lineTo(tx + 342 * sc, ty + 395 * sc);
  ctx.bezierCurveTo(tx + 297 * sc, ty + 380 * sc, tx + 262 * sc, ty + 395 * sc, tx + 256 * sc, ty + 400 * sc);
  ctx.bezierCurveTo(tx + 250 * sc, ty + 395 * sc, tx + 215 * sc, ty + 380 * sc, tx + 170 * sc, ty + 395 * sc);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(203,213,225,0.8)';
  ctx.lineWidth = 4 * sc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx + 256 * sc, ty + 360 * sc);
  ctx.lineTo(tx + 256 * sc, ty + 400 * sc);
  ctx.stroke();

  ctx.restore();

  // Platform name label inside badge
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(size * 0.14)}px 'Segoe UI', 'Arial', sans-serif`;
  ctx.fillStyle = 'rgba(255,248,225,0.92)';
  ctx.fillText('\u0627\u0644\u0623\u0648\u0644', bx + size / 2, by + size - Math.round(size * 0.07));
  ctx.restore();

  ctx.restore();
}

// ─── Main exports ──────────────────────────────────────────────────────────

export function generateCertificate(data: CertificateData): { dataUrl: string; certNumber: string } {
  const W = 1400;
  const H = 990;

  const certNumber = generateCertificateNumber(data);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Clean navy, ivory and cyan palette keeps the certificate contemporary and printable.
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#f8fbff');
  bgGrad.addColorStop(0.55, '#ffffff');
  bgGrad.addColorStop(1, '#eef6fb');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Restrained dot texture adds depth without competing with the content.
  ctx.fillStyle = 'rgba(15, 118, 143, 0.06)';
  for (let x = 30; x < W; x += 42) {
    for (let y = 30; y < H; y += 42) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bold side rail and minimal frame.
  ctx.fillStyle = '#0f3557';
  ctx.fillRect(0, 0, 28, H);
  ctx.fillStyle = '#1bb3c8';
  ctx.fillRect(28, 0, 8, H);
  roundRect(ctx, 58, 52, W - 116, H - 104, 20);
  ctx.strokeStyle = '#d7e8ef';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#1bb3c8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(92, 112); ctx.lineTo(92, 260);
  ctx.moveTo(W - 92, H - 260); ctx.lineTo(W - 92, H - 112);
  ctx.stroke();

  // Brand mark.
  ctx.save();
  roundRect(ctx, 92, 92, 72, 72, 18);
  ctx.fillStyle = '#0f3557'; ctx.fill();
  ctx.fillStyle = '#70e1e8';
  ctx.beginPath(); ctx.arc(128, 128, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f3557';
  ctx.font = "bold 25px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillText('\u0645\u0646\u0635\u0629 \u0627\u0644\u0623\u0648\u0644 \u0644\u0644\u062a\u0639\u0644\u064a\u0645', 210, 137);
  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.font = "600 17px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#648096';
  ctx.fillText('CERTIFICATE OF COMPLETION', W - 92, 137);
  ctx.restore();

  // Main title
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = "bold 62px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#0f3557';
  ctx.fillText('\u0634\u0647\u0627\u062f\u0629 \u0625\u062a\u0645\u0627\u0645', W / 2, 270);
  ctx.restore();

  // Decorative line
  const lineY = 292;
  const lineHalfW = 220;
  const lineGrad = ctx.createLinearGradient(W / 2 - lineHalfW, lineY, W / 2 + lineHalfW, lineY);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, '#1bb3c8');
  lineGrad.addColorStop(0.7, '#1bb3c8');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - lineHalfW, lineY);
  ctx.lineTo(W / 2 + lineHalfW, lineY);
  ctx.stroke();

  // "Attested for"
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = "20px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#648096';
  ctx.fillText('\u064a\u064f\u0634\u0647\u062f \u0644\u0640', W / 2, 335);
  ctx.restore();

  // Student name
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = "bold 50px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#102f4d';
  const nameLines = wrapText(ctx, data.studentName, W - 240);
  nameLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 420 + i * 58);
  });
  ctx.restore();

  const afterNameY = 420 + nameLines.length * 58;

  ctx.strokeStyle = 'rgba(27,179,200,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, afterNameY + 4);
  ctx.lineTo(W / 2 + 200, afterNameY + 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Completion phrase
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = "18px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#648096';
  ctx.fillText('\u0628\u0625\u062a\u0645\u0627\u0645\u0647/\u0647\u0627 \u0627\u0644\u062f\u0648\u0631\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628\u064a\u0629 \u0628\u0646\u062c\u0627\u062d', W / 2, afterNameY + 48);
  ctx.restore();

  // Course title
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = "bold 34px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#0b7890';
  const courseLines = wrapText(ctx, `" ${data.courseTitle} "`, W - 300);
  courseLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, afterNameY + 92 + i * 42);
  });
  ctx.restore();

  const afterCourseY = afterNameY + 92 + courseLines.length * 42;

  // Teacher name
  if (data.teacherName) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.font = "16px 'Segoe UI', 'Arial', sans-serif";
    ctx.fillStyle = '#648096';
    ctx.fillText(`\u0628\u0625\u0634\u0631\u0627\u0641 \u0627\u0644\u0623\u0633\u062a\u0627\u0630/\u0629: ${data.teacherName}`, W / 2, afterCourseY + 12);
    ctx.restore();
  }

  // Footer metadata strip
  const footerY = H - 150;
  const footerGrad = ctx.createLinearGradient(92, footerY, W - 92, footerY);
  footerGrad.addColorStop(0, '#eef8fb');
  footerGrad.addColorStop(0.5, '#dff2f5');
  footerGrad.addColorStop(1, '#eef8fb');
  roundRect(ctx, 92, footerY, W - 184, 70, 14);
  ctx.fillStyle = footerGrad;
  ctx.fill();

  // Date
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = "15px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#315d75';
  ctx.fillText(`\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u062a\u0645\u0627\u0645: ${data.completedDate}`, W - 120, footerY + 43);
  ctx.restore();

  // Website
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = "14px 'Segoe UI', 'Arial', sans-serif";
  ctx.fillStyle = '#315d75';
  ctx.fillText('al-awal.online', 120, footerY + 43);
  ctx.restore();

  // Certificate number centered in footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = "bold 11px 'Courier New', 'Consolas', monospace";
  ctx.fillStyle = 'rgba(49,93,117,0.80)';
  ctx.fillText(certNumber, W / 2, footerY + 45);
  ctx.restore();

  // Seal and platform mark sit above the metadata strip.
  drawSeal(ctx, W - 180, H - 250, 52);
  const badgeSize = 82;
  const badgeX = 110;
  const badgeY = H - badgeSize - 215;
  drawPlatformBadge(ctx, badgeX, badgeY, badgeSize);

  return { dataUrl: canvas.toDataURL('image/png'), certNumber };
}

/** Trigger a browser download of the certificate PNG */
export function downloadCertificate(data: CertificateData): string {
  const { dataUrl, certNumber } = generateCertificate(data);
  const a = document.createElement('a');
  a.href = dataUrl;
  const safeName = data.studentName.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  const safeCourse = data.courseTitle.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  a.download = `\u0634\u0647\u0627\u062f\u0629_${safeName}_${safeCourse}.png`;
  a.click();
  return certNumber;
}
