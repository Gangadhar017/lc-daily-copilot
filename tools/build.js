// Assembles store-ready packages from the source files:
//   dist/chromium/  -> Chrome + Edge (uses manifest.json)
//   dist/firefox/   -> Firefox Add-ons (uses manifest.firefox.json)
// Then zips them if `zip` output names are given as arguments (optional;
// zipping is normally done by the packaging shell).
// Usage: node tools/build.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const FILES = [
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
];

const ICONS = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];

function build(target, manifestName) {
  const dir = path.join(root, 'dist', target);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(dir, f));
  for (const i of ICONS) fs.copyFileSync(path.join(root, 'icons', i), path.join(dir, 'icons', i));
  fs.copyFileSync(path.join(root, manifestName), path.join(dir, 'manifest.json'));
  console.log('built ' + path.relative(root, dir));
}

build('chromium', 'manifest.json');
build('firefox', 'manifest.firefox.json');
