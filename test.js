import crypto from 'crypto';
console.time('rand');
const buf = crypto.randomBytes(200 * 1024 * 1024);
console.timeEnd('rand');
