const fs = require('fs');
let data = fs.readFileSync('src/views/chef/inventory/index.tsx', 'utf8');

const search =                             <td className="px-5 py-4 text-right">\n                                  title={isExpanded ? "Ðóng danh sách lô" : "Xem chi ti?t lô"}\n                                >\n                                  {isExpanded ? <Minus size={10} /> : <Eye size={10} />}\n                                  {isExpanded ? "Ðóng Lô" : "Xem Lô"}\n                                </button>\n                              </div>\n                            </td>;

const replace =                             <td className="px-5 py-4 text-right">\n                              <div className="flex justify-end">\n                                <button\n                                  onClick={(e) => {\n                                    e.stopPropagation();\n                                    toggleRowExpansion(ing.id);\n                                  }}\n                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"\n                                  title={isExpanded ? "Ðóng danh sách lô" : "Xem chi ti?t lô"}\n                                >\n                                  {isExpanded ? <Minus size={10} /> : <Eye size={10} />}\n                                  {isExpanded ? "Ðóng Lô" : "Xem Lô"}\n                                </button>\n                              </div>\n                            </td>;

if(data.includes(search)) {
  data = data.replace(search, replace);
  fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
  console.log("Fixed!");
} else {
  console.log("String not found. Doing regex...");
  const regex = /<td className="px-5 py-4 text-right">\s*title=\{isExpanded \? "Ðóng danh sách lô" : "Xem chi ti?t lô"\}\s*>\s*\{isExpanded \? <Minus size=\{10\} \/> : <Eye size=\{10\} \/>\}\s*\{isExpanded \? "Ðóng Lô" : "Xem Lô"\}\s*<\/button>\s*<\/div>\s*<\/td>/;
  if(regex.test(data)) {
    data = data.replace(regex, replace);
    fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
    console.log("Fixed with Regex!");
  } else {
    console.log("Regex also failed to find the string.");
  }
}
