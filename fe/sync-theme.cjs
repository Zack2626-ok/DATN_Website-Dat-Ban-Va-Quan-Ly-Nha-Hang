const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'views', 'admin');

const replacements = [
  // Cards and Backgrounds
  { regex: /bg-white/g, replacement: 'bg-[#1C2541]/40 backdrop-blur-xl' },
  { regex: /bg-gray-50/g, replacement: 'bg-[#1C2541]/80 backdrop-blur-md' },
  
  // Borders
  { regex: /border-gray-200/g, replacement: 'border-amber-500/20' },
  { regex: /border-admin-border/g, replacement: 'border-amber-500/20' },
  
  // Text Colors (Headings & Labels)
  { regex: /text-gray-700/g, replacement: 'text-amber-400 font-playfair drop-shadow-sm' },
  { regex: /text-gray-800/g, replacement: 'text-amber-400 font-playfair drop-shadow-sm' },
  
  // Text Colors (Subtext & Content)
  { regex: /text-gray-500/g, replacement: 'text-slate-400' },
  { regex: /text-gray-600/g, replacement: 'text-slate-300' },
  { regex: /text-gray-400/g, replacement: 'text-slate-500' },
  
  // Hovers
  { regex: /hover:bg-gray-50/g, replacement: 'hover:bg-white/5' },
  { regex: /hover:bg-slate-100/g, replacement: 'hover:bg-white/10' },
  
  // Accents
  { regex: /bg-blue-700/g, replacement: 'bg-amber-500/20 border-amber-500/30' },
  { regex: /text-blue-700/g, replacement: 'text-amber-400' },
  { regex: /text-blue-600/g, replacement: 'text-amber-400' },
  
  // Shadow adjustments for dark theme
  { regex: /shadow-sm/g, replacement: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]' },
  { regex: /shadow-2xs/g, replacement: 'shadow-[0_2px_10px_rgba(0,0,0,0.4)]' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
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

console.log('Starting theme synchronization...');
processDirectory(targetDir);
console.log('Done!');
