const fs = require('fs');

const svg = fs.readFileSync('D:\\el_awal\\apps\\web\\certificationFile.svg', 'utf8');

const modifiedSvg = svg.replace(/<path[^>]*fill="#155EEF"[^>]*>/g, '');

fs.writeFileSync('D:\\el_awal\\apps\\web\\public\\cert-test.svg', modifiedSvg);
console.log('Done');
