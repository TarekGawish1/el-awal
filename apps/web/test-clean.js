const fs = require('fs');

const svg = fs.readFileSync('D:\\el_awal\\apps\\web\\certificationFile.svg', 'utf8');

// Colors to hide
const textColors = ['#155EEF', '#555654', 'black', '#000000'];

// Parse and filter paths
let modifiedSvg = svg.replace(/<path\s+d="M\s*([0-9.-]+)\s*([0-9.-]+)[^>]*fill="([^"]+)"[^>]*>/gi, (match, xStr, yStr, fill) => {
  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  
  if (fill === '#155EEF') return ''; // Hide name
  
  if (textColors.includes(fill) || fill.toLowerCase() === 'black') {
    // Sentences
    if (y > 440 && y < 580 && x > 300 && x < 1300) return '';
    // Score
    if (y > 800 && y < 950 && x > 900 && x < 1000) return '';
    // Date
    if (y > 890 && y < 950 && x > 650 && x < 780) return '';
    // Year
    if (y > 790 && y < 850 && x > 480 && x < 580) return '';
  }
  
  return match;
});

fs.writeFileSync('D:\\el_awal\\apps\\web\\public\\cert-test-cleaned.svg', modifiedSvg);
console.log('Cleaned SVG saved');
