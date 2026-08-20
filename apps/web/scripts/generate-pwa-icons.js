const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1. Standard Logo SVG (Clean, vibrant, high-contrast)
const svgLogo = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3366FF" />
      <stop offset="50%" stop-color="#1E4BD9" />
      <stop offset="100%" stop-color="#0B1E63" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Subtle inner glowing ring -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="4" />

  <!-- Graduation Cap & Emblem Container with Drop Shadow -->
  <g filter="url(#shadow)" transform="translate(0, 10)">
    <!-- Cap Diamond / Top -->
    <path d="M 256 120 L 416 195 L 256 270 L 96 195 Z" fill="url(#capGrad)" />

    <!-- Cap Skull Base -->
    <path d="M 160 228 L 160 300 C 160 345, 352 345, 352 300 L 352 228 C 322 248, 289 258, 256 258 C 223 258, 190 248, 160 228 Z" fill="#E2E8F0" opacity="0.95" />

    <!-- Cap Ribbon Tassel String -->
    <path d="M 256 200 Q 370 215 375 290" fill="none" stroke="url(#accentGrad)" stroke-width="9" stroke-linecap="round" />
    
    <!-- Tassel Brush -->
    <path d="M 368 290 L 382 290 L 388 340 L 362 340 Z" fill="url(#accentGrad)" />
    <circle cx="375" cy="290" r="7" fill="#F59E0B" />

    <!-- Open Book Pages Symbol Below Cap -->
    <path d="M 170 355 C 215 340, 250 355, 256 360 C 262 355, 297 340, 342 355 L 342 395 C 297 380, 262 395, 256 400 C 250 395, 215 380, 170 395 Z" fill="#FFFFFF" opacity="0.9" />
    <path d="M 256 360 L 256 400" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
  </g>

  <!-- Small Top Right Golden Sparkle Star -->
  <path d="M 390 100 Q 405 115 420 115 Q 405 115 390 130 Q 405 115 420 115 Z" fill="url(#accentGrad)" />
</svg>
`;

// 2. Maskable Logo SVG (Larger background, 20% safe-padding around main symbol for Android adaptive icons)
const svgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3366FF" />
      <stop offset="50%" stop-color="#1E4BD9" />
      <stop offset="100%" stop-color="#0B1E63" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Full bleed square background without rounded corners for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Centered Emblem scaled to safe zone (80% / 0.78 scale) -->
  <g transform="translate(56, 62) scale(0.78)" filter="url(#shadow)">
    <!-- Cap Diamond / Top -->
    <path d="M 256 120 L 416 195 L 256 270 L 96 195 Z" fill="url(#capGrad)" />

    <!-- Cap Skull Base -->
    <path d="M 160 228 L 160 300 C 160 345, 352 345, 352 300 L 352 228 C 322 248, 289 258, 256 258 C 223 258, 190 248, 160 228 Z" fill="#E2E8F0" opacity="0.95" />

    <!-- Cap Ribbon Tassel String -->
    <path d="M 256 200 Q 370 215 375 290" fill="none" stroke="url(#accentGrad)" stroke-width="9" stroke-linecap="round" />
    
    <!-- Tassel Brush -->
    <path d="M 368 290 L 382 290 L 388 340 L 362 340 Z" fill="url(#accentGrad)" />
    <circle cx="375" cy="290" r="7" fill="#F59E0B" />

    <!-- Open Book Pages Symbol Below Cap -->
    <path d="M 170 355 C 215 340, 250 355, 256 360 C 262 355, 297 340, 342 355 L 342 395 C 297 380, 262 395, 256 400 C 250 395, 215 380, 170 395 Z" fill="#FFFFFF" opacity="0.9" />
    <path d="M 256 360 L 256 400" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>
`;

async function generateIcons() {
  console.log('Generating PWA icons...');

  // Save base SVGs
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svgLogo.trim());
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgLogo.trim());

  const logoBuffer = Buffer.from(svgLogo);
  const maskableBuffer = Buffer.from(svgMaskable);

  // 1. Standard Icons
  await sharp(logoBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png generated');

  await sharp(logoBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png generated');

  // 2. Maskable Icons (Android Adaptive)
  await sharp(maskableBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-192x192.png'));
  console.log('✓ icon-maskable-192x192.png generated');

  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512x512.png'));
  console.log('✓ icon-maskable-512x512.png generated');

  // 3. Apple Touch Icon (180x180 for iOS Safari)
  await sharp(logoBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generated');

  // 4. Favicon 32x32 and 16x16 PNGs
  await sharp(logoBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
  
  await sharp(logoBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(ICONS_DIR, 'favicon-16x16.png'));

  // Also copy apple touch icon and favicon to public root for maximum compatibility
  fs.copyFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'favicon-32x32.png'), path.join(PUBLIC_DIR, 'favicon.ico'));

  console.log('All PWA Icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
