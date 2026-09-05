#!/usr/bin/env node
// Mutation testing for the test-suite axis of a deep review.
//
// Breaks the source one edit at a time and re-runs the suite. A mutant the suite
// still passes is a survivor: a hole the tests do not cover. The survivor list is
// the finding; the score is the headline.
//
//   node mutate.mjs --root . --test "npm test"
//   node mutate.mjs --root . --test "node --test" --src src --max 40 --json
//
// Two decisions here exist because hand-rolled harnesses get them wrong:
//
//   Kill is decided by EXIT STATUS, never by reading the runner's output. Parsing
//   stdout breaks on locale, colour and non-ASCII glyphs, and it fails toward
//   "killed", which flatters the suite you are trying to judge.
//
//   Matches inside comments and string literals are skipped, and a match must sit
//   entirely in code. Mutating a comment produces a mutant identical to the
//   original, which always survives and shows up as a fake hole.
//
// It refuses to run if the suite is not already green, because against a red
// baseline every mutant "dies" and the score is meaningless.
//
// Dependencies: the per-mutant copy links the root node_modules into itself
// (junction on Windows, symlink elsewhere), so suites that import installed
// packages run normally. If the link cannot be created you are warned once.
//
// Languages. Regex-driven, no AST. The catalog is strongest for C-family syntax —
// JS/TS, Go, Java, C, C++, Swift, Objective-C, PHP — and carries word-operator
// entries for Python and SQL. Comment and string masking is selected per file
// extension: Python's // is floor division, not a comment; SQL comments are --
// and its strings escape quotes by doubling, not backslash; a shell # starts a
// comment only at a word boundary, so $# and ${#var} stay code. Template-literal
// interpolations (`${...}`) count as code and are mutated; the surrounding string
// text is not. Files with CRLF endings are analysed and written back LF-normalised.
//
// Known trade-offs, chosen on purpose:
//   < and > are mutated only when spaced (a < b). Unspaced comparisons (i<n) are
//   missed, in exchange for not mutating TS/Java/C++ generics, #include <...>,
//   and <?php into guaranteed-dead noise.
//   A mutant that fails to compile counts as killed. In compiled languages that
//   inflates the score; read the survivor list, not the percentage.
//   On Windows, a test command that HANGS is killed at the shell level only; the
//   underlying process may linger and its temp copy may not be removable. The
//   run continues and reports any leftover directories at the end.
//
// .sh and .sql are NOT mutated by default: the suite executes what it tests, and
// a damaged shell script or migration can touch things outside the copy. Opt in
// with --ext when the suite is known to be sandboxed.
//
// It is a probe, not a proof: a surviving mutant is strong evidence of a gap, a
// killed one only means that single edit was caught.

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

// ------------------------------------------------------------------- options
const OPTS = { root: '.', test: 'node --test', src: 'src', max: 60, timeout: 120000, json: false,
  ext: '.js,.mjs,.cjs,.ts,.tsx,.jsx,.swift,.go,.java,.c,.cc,.cpp,.cxx,.h,.hpp,.m,.mm,.php,.py' };
const KNOWN = new Set(Object.keys(OPTS));
let timeoutExplicit = false;
const die = (msg) => { console.error(msg); process.exit(2); };

for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--json') { OPTS.json = true; continue; }
  if (a === '--help' || a === '-h') {
    const lines = readFileSync(new URL(import.meta.url), 'utf8').split('\n');
    const end = lines.findIndex((l) => l.startsWith('import '));
    console.log(lines.slice(1, end).join('\n').replace(/^\/\/ ?/gm, ''));
    process.exit(0);
  }
  if (!a.startsWith('--')) die(`Unexpected argument "${a}". Options start with --; see --help.`);
  const k = a.slice(2);
  if (!KNOWN.has(k)) die(`Unknown option --${k}. Known: ${[...KNOWN].map((x) => '--' + x).join(', ')}.`);
  const v = process.argv[++i];
  if (v === undefined) die(`--${k} needs a value.`);
  if (k === 'max' || k === 'timeout') {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) die(`--${k} must be a positive integer, got "${v}".`);
    OPTS[k] = n;
    if (k === 'timeout') timeoutExplicit = true;
  } else OPTS[k] = v;
}

// ---------------------------------------------------------------- code masking
// True for every index that is real code — not inside a comment or a string.
// Comment syntax is chosen per extension. Getting it wrong fails in one of two bad
// directions: treating Python's // floor division as a comment masks real code,
// and missing SQL's -- comments plans mutants that cannot die.
function maskSpec(ext) {
  if (ext === '.py') return { line: ['#'], block: false, triple: true, template: false, wordHash: false, noEsc: false };
  if (ext === '.sh' || ext === '.bash') return { line: ['#'], block: false, triple: false, template: false, wordHash: true, noEsc: false };
  if (ext === '.sql') return { line: ['--'], block: true, triple: false, template: false, wordHash: false, noEsc: true };
  if (ext === '.php') return { line: ['//', '#'], block: true, triple: false, template: false, wordHash: false, noEsc: false };
  return { line: ['//'], block: true, triple: false, template: true, wordHash: false, noEsc: false };  // C family
}

function codeMask(s, spec) {
  const m = new Uint8Array(s.length).fill(1);
  const blank = (from, to) => { for (let j = from; j < to && j < s.length; j++) m[j] = 0; };

  // Plain quoted string starting at i; returns the index just past it.
  function scanQuote(i) {
    const q = s[i];
    let j = i + 1;
    while (j < s.length) {
      if (!spec.noEsc && s[j] === '\\') { j += 2; continue; }
      if (s[j] === q) { j++; break; }
      j++;
    }
    blank(i, j);
    return j;
  }

  // Template literal starting at i (C family). String text is masked; the code
  // inside ${...} interpolations stays code — it is real, mutable logic — and
  // nested strings or templates inside the interpolation are scanned in turn.
  function scanTemplate(i) {
    blank(i, i + 1); i++;                          // opening backtick
    while (i < s.length) {
      if (s[i] === '\\') { blank(i, i + 2); i += 2; continue; }
      if (s[i] === '`') { blank(i, i + 1); return i + 1; }
      if (s[i] === '$' && s[i + 1] === '{') {
        blank(i, i + 2); i += 2;                   // the ${ itself is syntax
        let depth = 1;
        while (i < s.length && depth > 0) {
          const c = s[i];
          if (c === '{') { depth++; i++; continue; }
          if (c === '}') { depth--; if (depth === 0) { blank(i, i + 1); } i++; continue; }
          if (c === '`') { i = scanTemplate(i); continue; }
          if (c === '"' || c === "'") { i = scanQuote(i); continue; }
          i++;                                     // interpolation code: leave as code
        }
        continue;
      }
      blank(i, i + 1); i++;                        // ordinary template text
    }
    return i;
  }

  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const lc = spec.line.find((t) => s.startsWith(t, i));
    // In shell, # opens a comment only at a word boundary: $# and ${#var} are code.
    const lineOk = lc && (!spec.wordHash || i === 0 || /[\s;&|(]/.test(s[i - 1]));
    if (lineOk) { const e = s.indexOf('\n', i); const to = e === -1 ? s.length : e; blank(i, to); i = to; continue; }
    if (spec.block && c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); const to = e === -1 ? s.length : e + 2; blank(i, to); i = to; continue; }
    if (spec.triple && (s.startsWith('"""', i) || s.startsWith("'''", i))) {
      const q = s.slice(i, i + 3);
      const e = s.indexOf(q, i + 3); const to = e === -1 ? s.length : e + 3;
      blank(i, to); i = to; continue;
    }
    if (c === '`' && spec.template) { i = scanTemplate(i); continue; }
    if (c === '"' || c === "'" || c === '`') { i = scanQuote(i); continue; }
    i++;
  }
  return m;
}

// ------------------------------------------------------------- mutation catalog
// Each entry: [name, pattern, replacement, families]. Families: 'c' covers the
// C-syntax languages (JS/TS, Go, Java, C, C++, Swift, Objective-C, PHP); 'py'
// Python; 'sql' SQL; 'sh' shell. An entry runs only on files of its families.
// Word boundaries are spelled out because \b is ASCII-only: an identifier like
// señor must not donate its 'or'.
const W = 'A-Za-z0-9_\\u0080-\\uffff';
const word = (t, flags = 'g') => new RegExp(`(?<![${W}])${t}(?![${W}])`, flags);
const CATALOG = [
  ['return-true-to-false', word('return true'), 'return false', 'c'],
  ['return-false-to-true', word('return false'), 'return true', 'c'],
  // Collapsing a computed predicate to a constant is the mutation that exposes a
  // check nothing actually checks — a guard the suite only ever calls on inputs
  // where the answer was going to be that constant anyway.
  ['predicate-always-true', /\breturn (?!true\b|false\b)[^;\n]+;/g, 'return true;', 'c'],
  ['predicate-always-false', /\breturn (?!true\b|false\b)[^;\n]+;/g, 'return false;', 'c'],
  // Swift and Go write no trailing semicolon, so the pair above never fires there.
  // These $-anchored twins cover them. A semicolon-terminated return can never
  // match (the ; blocks the anchor), but a MULTI-LINE return chain could: its
  // first line also ends without ;. The two guards close that — the line must not
  // end in a continuation operator, and the next line must not open with one.
  ['predicate-always-true-nosemi',
    /\breturn (?!true\b|false\b)[^;\n]*[^ \t;,+\-*/&|=<>({[.][ \t]*$(?!\n[ \t]*[.\[(+\-*/&|?:])/gm,
    'return true', 'c'],
  ['predicate-always-false-nosemi',
    /\breturn (?!true\b|false\b)[^;\n]*[^ \t;,+\-*/&|=<>({[.][ \t]*$(?!\n[ \t]*[.\[(+\-*/&|?:])/gm,
    'return false', 'c'],
  ['strict-eq-to-neq', /===/g, '!==', 'c'],
  ['strict-neq-to-eq', /!==/g, '===', 'c'],
  // Bare == / != are the primary equality operators everywhere in the C family
  // except JS; the guards keep ===, !==, <=, >= and => untouched.
  ['eq-to-neq', /(?<![<>!=])==(?!=)/g, '!=', 'c,py'],
  ['neq-to-eq', /(?<!=)!=(?!=)/g, '==', 'c,py'],
  ['lte-to-lt', /<=/g, '<', 'c,py,sql'],
  ['gte-to-gt', />=/g, '>', 'c,py,sql'],
  // Spaced-only on purpose: unspaced i<n is missed, but Array<string>,
  // #include <...> and <?php stop becoming guaranteed-dead noise mutants.
  ['lt-to-lte', /(?<=[ \t])<(?=[ \t])/g, '<=', 'c,py,sql'],
  ['gt-to-gte', /(?<=[ \t])>(?=[ \t])/g, '>=', 'c,py,sql'],
  ['and-to-or', /&&/g, '||', 'c,sh'],
  ['or-to-and', /\|\|/g, '&&', 'c,sh'],
  ['drop-abs', /Math\.abs\(/g, '(', 'c'],
  ['round-to-trunc', /Math\.round\(/g, 'Math.trunc(', 'c'],
  ['max-to-min', /Math\.max\(/g, 'Math.min(', 'c'],
  ['min-to-max', /Math\.min\(/g, 'Math.max(', 'c'],
  ['plus-to-minus', / \+ /g, ' - ', 'c,py'],
  ['minus-to-plus', / - /g, ' + ', 'c,py'],
  // Python spells its operators as words, so the swaps that matter there are
  // word-based; True/False collapse plays the role return-true/false plays above.
  ['py-and-to-or', word('and'), 'or', 'py'],
  ['py-or-to-and', word('or'), 'and', 'py'],
  ['py-true-to-false', word('True'), 'False', 'py'],
  ['py-false-to-true', word('False'), 'True', 'py'],
  ['py-predicate-true', /\breturn (?!True\b|False\b|None\b)[^#\n]+/g, 'return True', 'py'],
  ['py-predicate-false', /\breturn (?!True\b|False\b|None\b)[^#\n]+/g, 'return False', 'py'],
  ['py-drop-abs', /\babs\(/g, '(', 'py'],
  ['sql-and-to-or', word('AND', 'gi'), 'OR', 'sql'],
  ['sql-or-to-and', word('OR', 'gi'), 'AND', 'sql'],
];
const famOf = (ext) => ext === '.py' ? 'py' : ext === '.sql' ? 'sql'
  : (ext === '.sh' || ext === '.bash') ? 'sh' : 'c';

// ------------------------------------------------------------------- discovery
// Never copied, and never walked for sources either — the walk and the copy MUST
// agree, or a file gets planned that no copy contains.
const SKIP = new Set(['node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out',
  'target', 'coverage', '.next', '.nuxt', '.turbo', '.venv', '__pycache__']);
const exts = OPTS.ext.split(',');
const isTestFile = (rel) => /(^|[\\/.])(test|tests|spec|__tests__)([\\/.]|$)/i.test(rel);

const root = path.resolve(OPTS.root);
const srcRoot = path.resolve(root, OPTS.src);
{
  const rel = path.relative(root, srcRoot);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    die(`--src (${srcRoot}) must lie inside --root (${root}); mutants are written into a disposable copy of --root, and a source outside it would be mutated in place.`);
  }
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(p, out); }
    else if (exts.includes(path.extname(e.name)) && !isTestFile(path.relative(root, p))) out.push(p);
  }
  return out;
}

const files = walk(srcRoot);
if (files.length === 0) {
  die(`No source files under ${srcRoot} (extensions ${OPTS.ext}, test files and ${[...SKIP].slice(0, 4).join('/')}/... skipped).`);
}

// --------------------------------------------------------------- plan mutations
const lineOf = (s, idx) => s.slice(0, idx).split('\n').length;
const perFile = new Map();
for (const file of files) {
  // CRLF would thread \r through the $-anchored rules and the guard classes;
  // analyse and write back LF-normalised instead. Mutants are throwaway.
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const ext = path.extname(file);
  const fam = famOf(ext);
  const mask = codeMask(text, maskSpec(ext));
  const list = [];
  for (const [name, re, to, fams] of CATALOG) {
    if (!fams.split(',').includes(fam)) continue;        // wrong language family
    outer: for (const m of text.matchAll(re)) {
      // The WHOLE match must be code: a match that starts in code and runs into a
      // string or comment would chop the literal in half.
      for (let j = m.index; j < m.index + m[0].length; j++) if (!mask[j]) continue outer;
      list.push({ file, rel: path.relative(root, file), name, index: m.index, from: m[0], to,
        line: lineOf(text, m.index), text });
    }
  }
  list.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
  if (list.length) perFile.set(file, list);
}
const planned = [...perFile.values()].reduce((n, l) => n + l.length, 0);

// Round-robin the budget across files, so an alphabetically-early file cannot
// consume all of --max and leave later files unmeasured.
const chosen = [];
for (let k = 0; chosen.length < Math.min(OPTS.max, planned); k++) {
  for (const list of perFile.values()) {
    if (list[k]) { chosen.push(list[k]); if (chosen.length === Math.min(OPTS.max, planned)) break; }
  }
}
const dropped = planned - chosen.length;

if (planned === 0) {
  const msg = 'No mutants planned: nothing in the catalog matched code in --src (every candidate was masked, the wrong language family, or absent). There is no score — this measures nothing either way.';
  if (OPTS.json) console.log(JSON.stringify({ score: null, run: 0, killed: 0, survived: 0, notRun: 0, timedOut: 0, survivors: [], note: msg }, null, 2));
  else console.log(msg);
  process.exit(0);
}

// ------------------------------------------------------------------ run helpers
let timeoutMs = OPTS.timeout;   // replaced by a measured value once the baseline runs
const leaked = [];

function runSuite(cwd) {
  const started = process.hrtime.bigint();
  const r = spawnSync(OPTS.test, { cwd, shell: true, timeout: timeoutMs, stdio: 'ignore', windowsHide: true });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  if (r.error && r.error.code === 'ETIMEDOUT') return { passed: false, note: 'timeout', ms };
  return { passed: r.status === 0, note: r.status === null ? 'no exit status' : '', ms };
}

let nmWarned = false;
function withCopy(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutate-'));
  try {
    cpSync(root, dir, { recursive: true,
      filter: (s) => !path.relative(root, s).split(path.sep).some((seg) => SKIP.has(seg)) });
    // Dependencies are not copied; link them so the suite can import them.
    const nm = path.join(root, 'node_modules');
    if (existsSync(nm)) {
      try { symlinkSync(nm, path.join(dir, 'node_modules'), 'junction'); }
      catch (e) {
        if (!nmWarned) { nmWarned = true; process.stderr.write(`warning: could not link node_modules into the copy (${e.code}); a suite that imports installed packages will fail its runs\n`); }
      }
    }
    return fn(dir);
  } finally {
    // A hung test on Windows can outlive the killed shell and hold the copy.
    // A failed delete must not kill the run — report it at the end instead.
    try { rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
    catch { leaked.push(dir); }
  }
}

// ------------------------------------------------------------- baseline must be green
process.stderr.write('checking the baseline is green... ');
const base = withCopy((d) => runSuite(d));
if (!base.passed) {
  console.error(`FAILED${base.note ? ' (' + base.note + ')' : ''}.

The suite does not pass on unmodified source, so every mutant would "die" for the
wrong reason and the score would mean nothing. Get the baseline green, or point
--test at a command that passes, before measuring anything.`);
  process.exit(2);
}
process.stderr.write(`green (${(base.ms / 1000).toFixed(1)}s).\n`);

// A mutation can hang — an inverted loop bound is enough. A flat two-minute cap
// times 60 mutants is hours of waiting, so scale the cap to what the suite
// actually takes. An explicit --timeout always wins.
if (!timeoutExplicit) {
  timeoutMs = Math.max(10000, Math.ceil(base.ms * 10));
  process.stderr.write(`per-mutant timeout ${(timeoutMs / 1000).toFixed(0)}s (10x baseline; override with --timeout)\n`);
}

if (dropped > 0) process.stderr.write(`planning ${chosen.length} of ${planned} mutants (--max ${OPTS.max}; ${dropped} not run, budget spread round-robin across files)\n`);
else process.stderr.write(`planning ${chosen.length} mutants\n`);
const startedAll = process.hrtime.bigint();

// ------------------------------------------------------------------------- run
const results = [];
for (const [i, mut] of chosen.entries()) {
  process.stderr.write(`\r  ${i + 1}/${chosen.length}   `);
  const outcome = withCopy((dir) => {
    const target = path.join(dir, mut.rel);
    writeFileSync(target, mut.text.slice(0, mut.index) + mut.to + mut.text.slice(mut.index + mut.from.length));
    return runSuite(dir);
  });
  results.push({ ...mut, survived: outcome.passed, note: outcome.note });
}
process.stderr.write('\r' + ' '.repeat(24) + '\r');

// ---------------------------------------------------------------------- report
const survivors = results.filter((r) => r.survived)
  .sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
const timedOut = results.filter((r) => r.note === 'timeout').length;
const score = (results.length - survivors.length) / results.length;
const elapsed = Number(process.hrtime.bigint() - startedAll) / 1e9;

if (OPTS.json) {
  console.log(JSON.stringify({ score, run: results.length, killed: results.length - survivors.length,
    survived: survivors.length, notRun: dropped, timedOut,
    survivors: survivors.map(({ rel, line, name, from, to }) => ({ file: rel, line, mutation: name, from, to })) }, null, 2));
} else {
  console.log(`mutation score  ${(100 * score).toFixed(0)}%   ${results.length - survivors.length} killed / ${results.length} run   ${elapsed.toFixed(0)}s` +
    (dropped ? `   (${dropped} more planned but not run — raise --max to cover them)` : ''));
  if (timedOut) console.log(`${timedOut} mutant${timedOut === 1 ? '' : 's'} timed out and are counted as killed; if that looks wrong, raise --timeout.`);
  if (survivors.length === 0) {
    console.log('\nNo survivors. Every mutation the catalog produced was caught.');
  } else {
    console.log(`\n${survivors.length} survivor${survivors.length === 1 ? '' : 's'} — each is a change the suite does not notice:\n`);
    for (const s of survivors) {
      console.log(`  ${s.rel}:${s.line}  ${s.from} -> ${s.to}   [${s.name}]`);
    }
    console.log('\nReport the survivors, not the score: "inverting the sign of every fee row leaves');
    console.log('all tests green" is a finding a reader can act on, a percentage is not.');
  }
}
if (leaked.length) {
  process.stderr.write(`\nwarning: ${leaked.length} temp cop${leaked.length === 1 ? 'y' : 'ies'} could not be removed (a hung test may still hold them):\n` +
    leaked.map((d) => '  ' + d).join('\n') + '\n');
}
process.exit(0);
