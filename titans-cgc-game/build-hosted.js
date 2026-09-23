/* Build the hosted copy from index.html mechanically. The Artifact host wraps
   the file in its own doctype/head/body, so strip ours and keep the rest
   byte-identical — one source of truth, no second copy to drift. */
const fs = require('fs');
const path = require('path');

/* This file's own folder is the project, so the script follows the checkout
   it ships with instead of a path that only ever existed on one machine. */
const SRC = path.join(__dirname, 'index.html');
const OUT = path.join(__dirname, 'hosted.html');

const s = fs.readFileSync(SRC, 'utf8');

const titleAt = s.indexOf('<title>');
const styleEnd = s.indexOf('</style>') + '</style>'.length;
const bodyAt = s.indexOf('<body>') + '<body>'.length;
const bodyEnd = s.lastIndexOf('</body>');

if (titleAt < 0 || styleEnd < 8 || bodyAt < 6 || bodyEnd < 0) {
  console.error('could not find the parts to strip'); process.exit(1);
}

const head = s.slice(titleAt, styleEnd);   // title + font links + styles
const body = s.slice(bodyAt, bodyEnd);     // markup + script

const out = head + '\n' + body.trim() + '\n';
fs.writeFileSync(OUT, out);

/* Guard rails: the wrapper tags must be gone, and the substance must not be. */
const bad = [];
[/<!DOCTYPE/i, /<html[\s>]/i, /<head[\s>]/i, /<\/head>/i, /<body[\s>]/i, /<\/body>/i, /<\/html>/i]
  .forEach(re => { if (re.test(out)) bad.push(re.source); });
if (bad.length) { console.error('wrapper tags survived: ' + bad.join(', ')); process.exit(1); }

const need = ['<title>Titans CGC Game</title>', 'fonts.googleapis.com', 'var SNAPSHOT',
              'function compute()', 'id="versus"', 'id="mvpHero"', 'function useSnapshot',
              'id="rulesTable"', 'function readAdjGrid', 'id="draw"',
              'function makeDraw', 'function readGroupsGrid', 'function flushSaves',
              'function renderMentors', 'id="syncTag"'];
const missing = need.filter(t => out.indexOf(t) === -1);
if (missing.length) { console.error('content missing: ' + missing.join(', ')); process.exit(1); }

console.log('built hosted.html  ' + Math.round(out.length / 1024) + ' KB');
console.log('  starts: ' + out.slice(0, 60).replace(/\n/g, ' '));
console.log('  ends  : ' + out.slice(-40).replace(/\n/g, ' '));
console.log('  wrapper tags stripped, all key content present');
