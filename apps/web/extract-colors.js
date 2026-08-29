const fs = require('fs');

const svg = fs.readFileSync('D:\\el_awal\\apps\\web\\certificationFile.svg', 'utf8');

const regex = /<path d="M([^"]+)" fill="([^"]+)"/g;
let match;
const fills = {};

while ((match = regex.exec(svg)) !== null) {
  const d = match[1];
  const fill = match[2];
  
  const coords = d.split(/[A-Za-z\s,]+/).filter(c => c.trim().length > 0).map(Number);
  if (coords.length >= 2 && !isNaN(coords[0])) {
    fills[fill] = (fills[fill] || 0) + 1;
  }
}

console.log('Fill colors:', fills);
