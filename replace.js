const fs = require('fs');
let content = fs.readFileSync('fe/src/views/chef/inventory/index.tsx', 'utf8');
content = content.replace(/text-slate-400/g, 'text-slate-600');
content = content.replace(/text-slate-500/g, 'text-slate-700');
fs.writeFileSync('fe/src/views/chef/inventory/index.tsx', content, 'utf8');
console.log('Replaced text-slate classes');
