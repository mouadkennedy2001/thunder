'use strict';
// one-off: write standalone copies of the icon set into public/icons
const fs = require('fs');
const path = require('path');
const { icons } = require('../lib/icons');

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, body] of Object.entries(icons)) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d5b" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
    body +
    '</svg>';
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
}
console.log('icons written:', Object.keys(icons).length);
