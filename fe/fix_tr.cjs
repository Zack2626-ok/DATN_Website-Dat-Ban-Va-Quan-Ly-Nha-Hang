const fs = require('fs');
let data = fs.readFileSync('src/views/chef/inventory/index.tsx', 'utf8');
data = data.replace(
  /<tr className=\{hover:bg-slate-50\/50 transition-colors \$\{isExpanded \? "bg-slate-50\/50" : ""\} \$\{selectedIngredients.includes\(ing.id\) \? "bg-blue-50\/30" : ""\}\}>/,
  \<tr 
    onClick={() => handleToggleRow(ing)}
    className={\\\hover:bg-slate-50/50 transition-colors cursor-pointer \\\ \\\\\\}
  >\
);
data = data.replace(
  /onChange=\{\(\) => handleToggleSelectIngredient\(ing\.id\)\}/,
  \onClick={(e) => e.stopPropagation()}\\n                                onChange={() => handleToggleSelectIngredient(ing.id)}\
);
data = data.replace(
  /<th scope="col" className="px-5 py-3 text-right">Ði?u ch?nh nhanh<\/th>/,
  \<th scope="col" className="px-5 py-3 text-right">Chi ti?t lô</th>\
);
data = data.replace(
  /<div className="flex justify-end gap-1\.5 items-center">[\s\S]*?<\/button>\s*<\/div>/,
  \<div className="flex justify-end items-center text-slate-400">
                                {isExpanded ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} />}
                              </div>\
);
data = data.replace(
  /import \{([^}]*)\} from "lucide-react";/,
  (match, p1) => {
    if (!p1.includes('ChevronDown')) p1 += ', ChevronDown, ChevronUp';
    return \import {\} from "lucide-react";\;
  }
);
fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
