// Assemble the single-file HTML deliverable.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'src');
const parts = ['01_core.js', '02_island.js', '03_landmarks.js', '04_life.js', '05_animate.js'];

let app = "'use strict';\n";
for (const p of parts) {
  const f = path.join(SRC, p);
  if (!fs.existsSync(f)) { console.error('missing', p); process.exit(1); }
  app += '\n// ======================= ' + p + ' =======================\n';
  app += fs.readFileSync(f, 'utf8');
  app += '\n';
}

const three = fs.readFileSync(path.join(__dirname, 'three.min.js'), 'utf8');
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const html = tpl.split('/*__THREE__*/').join(three).split('/*__APP__*/').join(app);
fs.writeFileSync(path.join(__dirname, 'app.bundle.js'), app, 'utf8');
const out = path.join(ROOT, 'london_voxel_diorama.html');
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
