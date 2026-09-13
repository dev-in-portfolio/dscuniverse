import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const required = ['Client Portal', 'https://dsc-intake.netlify.app/sign-in', '/supplier-profile', '/recognition', 'websites.darkstarconsultinggroup.com'];
const missing = required.filter(value => !index.includes(value));
if (index.includes('portal.darkstarconsultinggroup.com')) missing.push('deferred portal domain must not be live');
if (missing.length) {
  console.error(`Static contract failed: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Corporate entry-point contract passed.');
