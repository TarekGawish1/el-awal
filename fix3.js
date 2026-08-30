const fs = require('fs');
let code = fs.readFileSync('D:/el_awal/apps/web/src/app/page.tsx', 'utf8');
let lines = code.split('\n');

const sec = '\u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629';
const prep = '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u064A\u0629';
const prim = '\u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A\u0629';

lines[772] = \        const newSecondary = saved.filter((c: any) => c.stage === '\' || (c.data && c.data.stage === '\')).map(mapCert);\;
lines[773] = \        const newPreparatory = saved.filter((c: any) => c.stage === '\' || (c.data && c.data.stage === '\')).map(mapCert);\;
lines[774] = \        const newPrimary = saved.filter((c: any) => c.stage === '\' || (c.data && c.data.stage === '\')).map(mapCert);\;

fs.writeFileSync('D:/el_awal/apps/web/src/app/page.tsx', lines.join('\n'), 'utf8');
console.log('Fixed correctly with escapes.');

