/* eslint-env node */
/**
 * scanMojibake.cjs
 * ---------------------------------------------------------------------------
 * Audits the Tailoring Management System for double-encoded UTF-8 (mojibake)
 * text such as the peso sign and en dash written as two/three Latin-1 chars.
 *
 * Usage:
 *   node _tools/scanMojibake.cjs           -> report only
 *   node _tools/scanMojibake.cjs --write   -> repair the files in place
 * ---------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  ROOT,
  path.resolve(ROOT, '..', 'TAILORING_MS_SERVER'),
];

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.sql', '.env', '.example']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'uploads', '.vite', '_tools']);
const SKIP_FILES = /package-lock\.json$/;

/* Windows-1252 -> Unicode, inverted to map mojibake chars back to bytes. */
const CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.env' && e.name !== '.env.example') continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (!SKIP_FILES.test(full) && EXTS.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

/** Re-decode a mojibake string: char -> cp1252 byte -> utf8 string. */
function repair(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (CP1252[code] !== undefined) bytes.push(CP1252[code]);
    else if (code <= 0xff) bytes.push(code);
    else return text; // genuine char that is not part of a mojibake run
  }
  try {
    const decoded = Buffer.from(bytes).toString('utf8');
    return decoded.includes('\ufffd') ? text : decoded;
  } catch { return text; }
}

/**
 * Repair only the mojibake runs inside a line, leaving ASCII and any already
 * correct Unicode (for example a genuine peso sign) untouched.
 *
 * A run is a maximal sequence of non-ASCII characters that starts with a UTF-8
 * lead byte rendered as a Windows-1252 character (U+00C2 / U+00C3 / U+00E2 /
 * U+00F0) and decodes cleanly back to UTF-8.
 */
const RUN = /[\u0080-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]+/g;
const LEAD = /^[\u00c2\u00c3\u00e2\u00f0]/;

function repairLine(line) {
  return line.replace(RUN, (run) => (LEAD.test(run) ? repair(run) : run));
}

// Quick smoke test of the server formatter (safe: no DB connection needed).
const { formatPHP, formatPHPSmart, formatPHPCompact } = require(path.join(TARGETS[1], 'Server', 'lib', 'formatPHP.js'));
console.log('server formatPHP:', formatPHP(1800), formatPHP(1080), formatPHP(540), formatPHP(900), formatPHPSmart(1080.5), formatPHPCompact(1200000));

// Patch the two chart tick formatters in Customerdashboard.tsx to use the
// shared compact formatter (run only with --patch-charts).
if (process.argv.includes('--patch-charts')) {
  const chartFile = path.join(ROOT, 'Tailoring', 'src', 'dashboard', 'Customerdashboard.tsx');
  const PESO = String.fromCharCode(0x20b1);
  let chart = fs.readFileSync(chartFile, 'utf8');
  const re = new RegExp('tickFormatter=\\{\\(v\\) => `' + PESO + '\\$\\{v \\/ 1000\\}k`\\}', 'g');
  const n = (chart.match(re) || []).length;
  chart = chart.replace(re, 'tickFormatter={(v) => formatPHPCompact(v as number)}');
  fs.writeFileSync(chartFile, chart, 'utf8');
  console.log(`patched ${n} chart tick formatter(s)`);
}

const write = process.argv.includes('--write');
const files = TARGETS.flatMap((t) => walk(t, []));

let hitFiles = 0;
let hitLines = 0;
const report = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  // Mojibake runs always start with a lead byte that was rendered as Â, Ã or â.
  const lines = raw.split(/\r?\n/);
  let changed = false;
  const fixedLines = lines.map((line, idx) => {
    if (!/[\u00c2\u00c3\u00e2\u00f0]/.test(line)) return line;
    const fixed = repairLine(line);
    if (fixed === line) return line;
    hitLines += 1;
    report.push(`${path.relative(ROOT, file)}:${idx + 1}\n   - ${line.trim().slice(0, 150)}\n   + ${fixed.trim().slice(0, 150)}`);
    changed = true;
    return fixed;
  });
  if (changed) {
    hitFiles += 1;
    if (write) {
      const eol = raw.includes('\r\n') ? '\r\n' : '\n';
      fs.writeFileSync(file, fixedLines.join(eol), 'utf8');
    }
  }
}

const summary = `${write ? 'REPAIRED' : 'FOUND'}: ${hitLines} line(s) in ${hitFiles} file(s) of ${files.length} scanned.`;
if (!write) {
  const byFile = new Map();
  for (const entry of report) {
    const key = entry.split('\n')[0].split(':')[0];
    byFile.set(key, (byFile.get(key) || 0) + 1);
  }
  const header = [...byFile.entries()].map(([f, n]) => `  ${n.toString().padStart(4)}  ${f}`).join('\n');
  const out = path.join(ROOT, '_tools', 'mojibake-report.txt');
  fs.writeFileSync(out, `${summary}\n\nPER FILE:\n${header}\n\nDETAIL:\n${report.join('\n\n')}\n`, 'utf8');
  console.log(`${summary}\n${header}\nReport -> ${out}`);
} else {
  console.log(summary);
}
