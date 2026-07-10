const bcrypt = require('bcrypt');
const hash = '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa';
const pass = '123456';
bcrypt.compare(pass, hash).then(res => console.log('Match 123456:', res));
