/**
 * Canvas drawing helpers for certificate generation.
 */

/** Helper: wrap text to multiple lines within a max pixel width */
export function wrapText(
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
export function roundRect(
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
export function drawCorner(
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
export function drawSeal(
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
export function drawPlatformBadge(
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
