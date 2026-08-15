const fs = require('fs');
const oldHash = '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa';
const newHash = '$2b$10$xJ8/8bmzTml4vxWVLA23B.eTLy0x/PeP2XN.ofc7ypgjwZfk2H9Om';

// 1. Update SQLQuery1.sql
try {
  let sql = fs.readFileSync('SQLQuery1.sql', 'utf8');
  sql = sql.split(oldHash).join(newHash);
  fs.writeFileSync('SQLQuery1.sql', sql, 'utf8');
  console.log('Updated SQLQuery1.sql');
} catch (e) {
  console.error(e);
}

// 2. Update db.ts
try {
  let dbTs = fs.readFileSync('be/src/utils/db.ts', 'utf8');
  dbTs = dbTs.split(oldHash).join(newHash);
  fs.writeFileSync('be/src/utils/db.ts', dbTs, 'utf8');
  console.log('Updated db.ts');
} catch (e) {
  console.error(e);
}

// 3. Fix DB_HOST in be/.env
try {
  let env = fs.readFileSync('be/.env', 'utf8');
  env = env.replace('DB_HOST=localhost', 'DB_HOST=127.0.0.1');
  fs.writeFileSync('be/.env', env, 'utf8');
  console.log('Updated be/.env');
} catch (e) {
  console.error(e);
}
