const fs = require('fs');
const content = fs.readFileSync('be/src/controllers/inventory.controller.ts', 'utf8');
const index = content.indexOf('export const getSuppliers =');
if (index !== -1) {
    fs.writeFileSync('be/src/controllers/inventory.controller.ts', content.substring(0, index).trim());
    console.log('Truncated at ' + index);
} else {
    console.log('Not found');
    // Try to find the start of the corruption
    const lines = content.split('\n');
    let validLines = [];
    for (let line of lines) {
        if (line.includes('\0')) break; // UTF-16 null byte
        validLines.push(line);
    }
    fs.writeFileSync('be/src/controllers/inventory.controller.ts', validLines.join('\n').trim() + '\n');
    console.log('Truncated null bytes');
}
