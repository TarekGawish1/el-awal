const fs = require('fs');
let code = fs.readFileSync('D:/el_awal/apps/web/src/app/page.tsx', 'utf8');

const s1 = Buffer.from('ICAgICAgICBjb25zdCBuZXdTZWNvbmRhcnkgPSBzYXZlZC5maWx0ZXIoKGM6IGFueSkgPT4gYy5zdGFnZSA9PT0gJ9in2YTYq9in2YbZiNmK2KknIHx8IChjLmRhdGEgJiYgYy5kYXRhLnN0YWdlID09PSAn2KfZhNit2KfZhtmI2YrYqScpKS5tYXAobWFwQ2VydCk7', 'base64').toString('utf8');
const s2 = Buffer.from('ICAgICAgICBjb25zdCBuZXdQcmVwYXJhdG9yeSA9IHNhdmVkLmZpbHRlcigoYzogYW55KSA9PiBjLnN0YWdlID09PSAn2KXZhNil2LnYrdiv2KfYrdiv2YrYqScgfHwgKGMuZGF0YSAmJiBjLmRhdGEuc3RhZ2UgPT09ICfYpdmE2KXYudin2K/Yp9iv2YrYqScpKS5tYXAobWFwQ2VydCk7', 'base64').toString('utf8');
const s3 = Buffer.from('ICAgICAgICBjb25zdCBuZXdQcmltYXJ5ID0gc2F2ZWQuZmlsdGVyKChjOiBhbnkpID0+IGMuc3RhZ2UgPT09ICfYp9mE2KfYqNiq2K/Yp9im2YrYqScgfHwgKGMuZGF0YSAmJiBjLmRhdGEuc3RhZ2UgPT09ICfYp9mE2KfYqNiq2K/Yp9im2YrYqScpKS5tYXAobWFwQ2VydCk7', 'base64').toString('utf8');

let lines = code.split('\n');
lines[772] = s1;
lines[773] = s2;
lines[774] = s3;

fs.writeFileSync('D:/el_awal/apps/web/src/app/page.tsx', lines.join('\n'), 'utf8');
console.log('Done');

