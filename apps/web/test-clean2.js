const fs = require('fs');

const svg = fs.readFileSync('D:\\el_awal\\apps\\web\\certificationFile.svg', 'utf8');

const textColors = ['#155EEF', '#555654', 'black', '#000000'];

let modifiedSvg = svg.replace(/<path\s+d="M\s*([0-9.-]+)\s*([0-9.-]+)[^>]*fill="([^"]+)"[^>]*>/gi, (match, xStr, yStr, fill) => {
  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  
  if (fill === '#155EEF') return ''; // Hide name (all blue)
  
  if (textColors.includes(fill) || fill.toLowerCase() === 'black') {
    // Top sentence (Gender) Y ~ 475
    if (y > 440 && y < 510 && x > 300 && x < 1300) return '';
    
    // Bottom sentence (Subject) Y ~ 722
    if (y > 690 && y < 760 && x > 300 && x < 1300) return '';
    
    // Score Y ~ 917 (Gold Seal)
    if (y > 850 && y < 960 && x > 880 && x < 1000) return '';
    
    // Date Y ~ 910
    if (y > 880 && y < 940 && x > 660 && x < 760) return '';
    
    // Year Y ~ 823
    if (y > 780 && y < 860 && x > 480 && x < 580) return '';
  }
  
  return match; // Keep signature, footer, etc.
});

fs.writeFileSync('D:\\el_awal\\apps\\web\\public\\certificate-template.svg', modifiedSvg);
console.log('Final cleaned SVG saved');
