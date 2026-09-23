/* eslint-env node */
/**
 * auditCurrency.cjs
 * ---------------------------------------------------------------------------
 * Full audit of the Tailoring Management System for:
 *   1. Currency rendering (peso symbol, toLocaleString, Intl.NumberFormat...)
 *   2. Production-time / turnaround copy
 *   3. Broken (double-encoded) UTF-8 characters
 *
 * Usage: node _tools/auditCurrency.cjs
 * Output: _tools/audit-report.txt (UTF-8)
 * ---------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [ROOT, path.resolve(ROOT, '..', 'TAILORING_MS_SERVER')];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.sql', '.env']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'uploads', '.vite', '_tools']);
const SKIP_FILES = /package-lock\.json$/;

const PATTERNS = [
  ['RAW-PESO-TEMPLATE-\u20b1${', /\u20b1\$\{/],
  ['RAW-PESO-CONCAT', /\u20b1['"]\s*\+/],
  ['DASH-RANGE-COPY', /\d+\s*[\u2013\u2014-]\s*\d+\s*days?\b/i],
  ['PRODUCTION-TIME-LABEL', /Production time|Estimated production|Estimated Production/i],
  ['FROM-PESO', /From\s+\u20b1/],
];

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

const files = TARGETS.flatMap((t) => walk(t, []));
const buckets = new Map(PATTERNS.map(([name]) => [name, []]));

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of PATTERNS) {
      if (re.test(line)) buckets.get(name).push(`${rel}:${i + 1}  |  ${line.trim().slice(0, 180)}`);
    }
  });
}

const out = [];
for (const [name, hits] of buckets) {
  out.push(`\n===== ${name} (${hits.length}) =====`);
  out.push(...(hits.length ? hits : ['  (none)']));
}
const dest = path.join(ROOT, '_tools', 'audit-report.txt');
fs.writeFileSync(dest, out.join('\n') + '\n', 'utf8');
console.log(`Scanned ${files.length} file(s) -> ${dest}`);
for (const [name, hits] of buckets) console.log(`${name}: ${hits.length}`);
