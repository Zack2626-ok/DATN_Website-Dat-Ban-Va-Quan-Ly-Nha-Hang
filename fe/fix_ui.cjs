const fs = require('fs');
let data = fs.readFileSync('src/views/chef/inventory/index.tsx', 'utf8');

// 1. Disable row expansion
data = data.replace('expanded[b.ingredient_id] = true;', '');
data = data.replace('setExpandedRows(expanded);', '');

// 2. Remove dangling modal
const searchIndex = data.indexOf('{/* Modal B: Nh?p / Xu?t kho nhanh */}');
if (searchIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let currentIndex = data.indexOf('showImportExportModal && (', searchIndex);
    if (currentIndex !== -1) {
        currentIndex += 'showImportExportModal && ('.length;
        braceCount = 1;
        for (let i = currentIndex; i < data.length; i++) {
            if (data[i] === '(') braceCount++;
            if (data[i] === ')') braceCount--;
            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }
        if (endIndex !== -1) {
            const closingBraceIndex = data.indexOf('}', endIndex) + 1; 
            data = data.slice(0, searchIndex) + data.slice(closingBraceIndex);
            data = data.replace(/const\s*\[showImportExportModal,\s*setShowImportExportModal\]\s*=\s*useState\(.*?\);\s*/g, '');
        }
    }
}

// 3. Button
data = data.replace(
  '<Plus size={12} /> Nh?p b?ng tay',
  '<Plus size={12} /> Thêm nguyên li?u m?i'
);
const btnToReplace = `<button
                  onClick={() => setShowAddIngModal(true)}
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Thêm nguyên li?u m?i
                </button>`;

const newBtns = `<button
                  onClick={() => setCurrentView("importGoods")}
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Nh?p Hàng M?i
                </button>
                <button
                  onClick={() => setShowAddIngModal(true)}
                  className="px-3 py-1.5 bg-linear-to-r from-emerald-600 to-green-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Thêm N.Li?u M?i
                </button>`;
data = data.replace(btnToReplace, newBtns);

// 4. Update the T?N TH?P / AN TOÀN render
const isExpandedLine = 'const isExpanded = expandedRows[ing.id];\n                      const batches = batchData[ing.id] || [];';
const isExpandedReplace = 'const isExpanded = expandedRows[ing.id];\n                      const batches = batchData[ing.id] || [];\n                      const hasExpired = batches.some((b: any) => b.expiry_date && getExpiryLabel(b.expiry_date).status === "expired");';
data = data.replace(isExpandedLine, isExpandedReplace);

const tdToReplace = `<td className="px-5 py-4 text-center">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse">
                                  <AlertTriangle size={10} /> T?N TH?P (Du?i {ing.threshold} {ing.unit})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                                  <Check size={10} /> AN TOÀN
                                </span>
                              )}
                            </td>`;

const newTd = `<td className="px-5 py-4 text-center">
                              {hasExpired ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse" title="Có lô hàng dã h?t h?n!">
                                  <AlertTriangle size={10} /> LÔ H?T H?N
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-250 animate-pulse">
                                  <AlertTriangle size={10} /> T?N TH?P (Du?i {ing.threshold} {ing.unit})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                                  <Check size={10} /> AN TOÀN
                                </span>
                              )}
                            </td>`;

data = data.replace(tdToReplace, newTd);

fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
console.log('Done!');
