const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src', 'views'),
  path.join(__dirname, 'src', 'components')
];

const replacements = [
  // ==========================================
  // FROM DARK THEME (Admin views and Modals)
  // ==========================================
  { regex: /bg-\[#1C2541\]\/40 backdrop-blur-xl\/60/g, replacement: 'bg-white/80 backdrop-blur-xl' },
  { regex: /bg-\[#1C2541\]\/60 backdrop-blur-md/g, replacement: 'bg-white/80 backdrop-blur-xl' },
  { regex: /bg-\[#1C2541\]\/40 backdrop-blur-xl/g, replacement: 'bg-white/80 backdrop-blur-xl' },
  { regex: /bg-\[#1C2541\]\/80 backdrop-blur-md/g, replacement: 'bg-white/80 backdrop-blur-xl' },
  { regex: /bg-\[#1C2541\]/g, replacement: 'bg-sky-50' },
  { regex: /bg-\[#0B132B\]\/60/g, replacement: 'bg-sky-50/50' },
  { regex: /bg-\[#0B132B\]\/80/g, replacement: 'bg-sky-50/80' },
  { regex: /bg-\[#0B132B\]/g, replacement: 'bg-sky-100' },

  { regex: /border-amber-500\/20/g, replacement: 'border-sky-100' },
  { regex: /border-amber-500\/30/g, replacement: 'border-sky-200' },
  { regex: /border-white\/10/g, replacement: 'border-slate-200' },
  { regex: /border-white\/5/g, replacement: 'border-slate-100' },

  { regex: /text-amber-400 font-playfair drop-shadow-sm/g, replacement: 'text-sky-800 font-playfair drop-shadow-sm' },
  { regex: /text-amber-400/g, replacement: 'text-sky-700' },
  { regex: /text-amber-500/g, replacement: 'text-sky-600' },
  
  { regex: /text-slate-200/g, replacement: 'text-slate-700' },
  { regex: /text-slate-300/g, replacement: 'text-slate-600' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },

  { regex: /bg-amber-500\/20/g, replacement: 'bg-sky-100' },
  { regex: /bg-amber-500\/10/g, replacement: 'bg-sky-50' },

  { regex: /hover:bg-white\/5/g, replacement: 'hover:bg-sky-50' },
  { regex: /hover:bg-white\/10/g, replacement: 'hover:bg-sky-100' },
  { regex: /hover:text-amber-300/g, replacement: 'hover:text-sky-600' },
  { regex: /hover:text-amber-400/g, replacement: 'hover:text-sky-700' },

  // ==========================================
  // FROM LIGHT THEME (Waiter, Chef, Manager views)
  // ==========================================
  { regex: /bg-white rounded-2xl border border-gray-200 shadow-xs/g, replacement: 'bg-white/80 backdrop-blur-xl border border-sky-100 shadow-sm' },
  { regex: /bg-white rounded-2xl border border-gray-200 shadow-md/g, replacement: 'bg-white/80 backdrop-blur-xl border border-sky-100 shadow-md' },
  { regex: /bg-white p-3.5 rounded-xl border border-gray-200/g, replacement: 'bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-sky-100' },
  { regex: /bg-white p-8 rounded-2xl border border-gray-200/g, replacement: 'bg-white/90 backdrop-blur-md p-8 rounded-2xl border border-sky-100' },
  { regex: /bg-white rounded-2xl border border-gray-200 p-8/g, replacement: 'bg-white/90 backdrop-blur-md rounded-2xl border border-sky-100 p-8' },
  
  // Try to gently replace remaining big blocks of bg-white with glassmorphism if they have borders
  { regex: /bg-white rounded-xl border border-gray-200/g, replacement: 'bg-white/80 backdrop-blur-xl rounded-xl border border-sky-100' },
  { regex: /bg-white rounded-lg border border-gray-200/g, replacement: 'bg-white/80 backdrop-blur-md rounded-lg border border-sky-100' },

  // General borders
  { regex: /border-gray-200/g, replacement: 'border-sky-100' },
  { regex: /border-gray-100/g, replacement: 'border-sky-50' },
  { regex: /border-gray-300/g, replacement: 'border-sky-200' },
  
  // Backgrounds
  { regex: /bg-gray-50/g, replacement: 'bg-sky-50/50' },
  { regex: /bg-gray-100/g, replacement: 'bg-sky-100' },
  { regex: /hover:bg-gray-50/g, replacement: 'hover:bg-sky-50' },
  { regex: /hover:bg-gray-100/g, replacement: 'hover:bg-sky-100' },

  // Text
  { regex: /text-gray-900/g, replacement: 'text-slate-800' },
  { regex: /text-gray-800/g, replacement: 'text-slate-700' },
  { regex: /text-gray-700/g, replacement: 'text-slate-600' },
  { regex: /text-gray-600/g, replacement: 'text-slate-500' },
  { regex: /text-gray-500/g, replacement: 'text-slate-400' },

  // Main primary colors (previously #FF5A5F) -> sky-500
  { regex: /bg-\[#FF5A5F\]/g, replacement: 'bg-sky-500' },
  { regex: /text-\[#FF5A5F\]/g, replacement: 'text-sky-600' },
  { regex: /border-\[#FF5A5F\]/g, replacement: 'border-sky-500' },
  { regex: /ring-\[#FF5A5F\]/g, replacement: 'ring-sky-500' },
  { regex: /hover:bg-\[#e0484d\]/g, replacement: 'hover:bg-sky-600' }
];

function processDirectory(directory) {
  if (!fs.existsSync(directory)) return;
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      
      // EXCLUDE AUTH PAGES AND ACTOR SHELL LAYOUT (Already styled specifically)
      if (fullPath.includes('auth')) continue;
      if (fullPath.includes('ActorShellLayout.tsx')) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = false;
      
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log('Starting Sky Theme synchronization across all components...');
targetDirs.forEach(dir => processDirectory(dir));
console.log('Done!');
