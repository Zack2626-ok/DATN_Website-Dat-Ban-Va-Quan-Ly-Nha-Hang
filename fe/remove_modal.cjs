const fs = require('fs');
let data = fs.readFileSync('src/views/chef/inventory/index.tsx', 'utf8');

// Remove state declaration
data = data.replace(/const \[showImportExportModal, setShowImportExportModal\] = useState\(false\);\n?/, '');

// Find the modal block
const modalStartIdx = data.indexOf('{showImportExportModal && (');
if (modalStartIdx !== -1) {
  let openBrackets = 0;
  let modalEndIdx = -1;
  let started = false;
  
  for (let i = modalStartIdx; i < data.length; i++) {
    if (data[i] === '(') openBrackets++;
    if (data[i] === ')') openBrackets--;
    
    if (openBrackets > 0) started = true;
    
    if (started && openBrackets === 0) {
      modalEndIdx = i;
      break;
    }
  }
  
  if (modalEndIdx !== -1) {
    // Also remove the curly braces around it
    const startToRemove = data.lastIndexOf('{', modalStartIdx);
    const endToRemove = data.indexOf('}', modalEndIdx);
    data = data.slice(0, startToRemove) + data.slice(endToRemove + 1);
  }
}

fs.writeFileSync('src/views/chef/inventory/index.tsx', data, 'utf8');
