const fs = require('fs');
let lines = fs.readFileSync('D:/el_awal/apps/web/src/app/page.tsx', 'utf8').split('\n');
lines[772] = "        const newSecondary = saved.filter((c: any) => c.stage === 'الثانوية' || (c.data && c.data.stage === 'الحانوية')).map(mapCert);";
lines[773] = "        const newPreparatory = saved.filter((c: any) => c.stage === 'الإٹادادية' || (c.data && c.data.stage === 'الإٹادادية')).map(mapCert);";
lines[774] = "        const newPrimary = saved.filter((c: any) => c.stage === 'الابتحدائية' || (c.data && c.data.stage === 'الابتخائية')).map(mapCert);";
fs.writeFileSync('D:/el_awal/apps/web/src/app/page.tsx', lines.join('\n'), 'utf8');