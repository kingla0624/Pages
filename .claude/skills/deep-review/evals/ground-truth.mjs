// Proves the fixture is what the criteria assume it is.
//
// Run this before trusting any grading built on this fixture. Four defects and
// one low-reachability finding must be present, and three passages that look
// like defects must be correct — a run is scored partly on refusing to file
// those three, so if one ever becomes a real defect the scoring silently starts
// punishing correct answers.
//
//   node ground-truth.mjs
//
// Exits non-zero if any expectation fails.

import { readFileSync } from 'node:fs';
import { allocate, toCents } from './fixture/src/money.js';
import { feeFor, splitFee, bpsFor } from './fixture/src/fees.js';
import { netOrders } from './fixture/src/netting.js';
import { postAll, isBalanced } from './fixture/src/ledger.js';
import { displaySymbol, formatUsd, averagePositionCents, balanceColumn } from './fixture/src/report.js';
import { validateOrder } from './fixture/src/validate.js';
import { settleOrder, settleBatch } from './fixture/src/settle.js';

const out = [];
const defect = (id, claim, ok, ev) => out.push({ id, kind: 'DEFECT', claim, ok, ev });
const trap = (id, claim, ok, ev) => out.push({ id, kind: 'TRAP', claim, ok, ev });

// ---- X1: settle discards the sign fees deliberately produces ---------------
// Note the framing. The mechanical fact is what is graded; whether the current
// behaviour or the comment is "the bug" is undecidable from the repository, and
// a run arguing either way is correct. See criteria.md.
{
  const sellParts = splitFee(feeFor(-5000), 2);
  let l = settleOrder([], { symbol: 'A', quantity: 10, priceCents: 500 });
  l = settleOrder(l, { symbol: 'A', quantity: -10, priceCents: 500 });
  const fees = l.filter((e) => e.kind === 'fee').map((e) => e.amountCents);
  const kindRead = ['money', 'fees', 'netting', 'ledger', 'report', 'settle', 'validate']
    .some((f) => /\.kind\b/.test(readFileSync(new URL(`./fixture/src/${f}.js`, import.meta.url), 'utf8')));
  defect('X1', 'settle.js strips the fee sign with Math.abs, and the kind field it blames is never read',
    sellParts.every((p) => p < 0) && fees.every((f) => f > 0) && !kindRead,
    `sell fee parts ${JSON.stringify(sellParts)} posted as ${JSON.stringify(fees.slice(2))}; ` +
    `no module reads .kind`);
}

// ---- X2: validation guarantees per-order, netting divides by the net -------
{
  const a = { symbol: 'A', quantity: 10, priceCents: 500 };
  const b = { symbol: 'A', quantity: -10, priceCents: 500 };
  validateOrder(a); validateOrder(b);
  const flat = netOrders([a, b])[0].avgPriceCents;
  const skew = netOrders([a, { ...b, priceCents: 600 }])[0].avgPriceCents;
  defect('X2', 'two individually valid orders can net to zero and divide by it',
    Number.isNaN(flat) && !Number.isFinite(skew),
    `both pass validateOrder; same price -> avgPriceCents ${flat}, different prices -> ${skew} ` +
    `(renders as "${formatUsd(skew)}")`);
}

// ---- X3: a display truncation is used as the ledger key -------------------
{
  const l = settleBatch([], [
    { symbol: 'ACMECORP1', quantity: 10, priceCents: 500 },
    { symbol: 'ACMECORP2', quantity: 10, priceCents: 500 },
  ]);
  const keys = [...new Set(l.map((e) => e.key))];
  defect('X3', 'the 8-character display truncation is used as the ledger key',
    keys.length === 1 && displaySymbol('ACMECORP1') === displaySymbol('ACMECORP2'),
    `ACMECORP1 and ACMECORP2 both post under key "${keys.join(',')}"`);
}

// ---- X4: the integrity check cannot fail ---------------------------------
{
  let everFalse = false;
  for (let t = 0; t < 4000; t++) {
    const amts = Array.from({ length: 1 + (t % 6) }, (_, i) => ((t * 41 + i * 17) % 3001) - 1500);
    if (isBalanced(postAll([], amts.map((a) => ({ amountCents: a })))) === false) everFalse = true;
  }
  const tampered = postAll([], [{ amountCents: 10 }, { amountCents: 20 }]);
  tampered[0].balanceCents = 999;
  defect('X4', 'isBalanced cannot return false for a ledger built through post()',
    !everFalse && isBalanced(tampered) === true,
    `false never returned across 4,000 random ledgers; a tampered intermediate balance still reports balanced`);
}

// ---- R1: real, but no caller inside the package --------------------------
{
  const files = ['money', 'fees', 'netting', 'ledger', 'report', 'settle', 'validate', 'index'];
  const callers = files.filter((f) => {
    const s = readFileSync(new URL(`./fixture/src/${f}.js`, import.meta.url), 'utf8')
      .replace(/export function averagePositionCents/, '');
    return /averagePositionCents\s*\(/.test(s);
  });
  defect('R1', 'averagePositionCents returns NaN on an empty book with no caller in src',
    Number.isNaN(averagePositionCents([])) && callers.length === 0,
    `averagePositionCents([]) = ${averagePositionCents([])}; internal callers: ${callers.length || 'none'} ` +
    `— severity capped at Low, and the finding must still be filed`);
}

// ============ TRAPS — correct code. Filing one of these is a scored miss. ===

// ---- T1: === on integer cents is exact, not a float-equality bug ----------
{
  let exact = true;
  for (let t = 0; t < 5000; t++) {
    const amts = Array.from({ length: 1 + (t % 9) }, (_, i) => ((t * 53 + i * 29) % 4001) - 2000);
    if (!isBalanced(postAll([], amts.map((a) => ({ amountCents: a }))))) exact = false;
  }
  trap('T1', 'the === in isBalanced is not a float-equality bug',
    exact, `5,000 ledgers held exactly. The real defect on that line is X4, not the operator.`);
}

// ---- T2: allocate's sign handling is correct, negatives included ---------
{
  let bad = 0, n = 0;
  for (let cents = -5000; cents <= 5000; cents++) {
    for (const k of [1, 2, 3, 4, 7, 12]) {
      const parts = allocate(cents, k);
      n++;
      if (parts.length !== k || parts.reduce((a, b) => a + b, 0) !== cents
        || !parts.every(Number.isInteger) || Math.max(...parts) - Math.min(...parts) > 1) bad++;
    }
  }
  trap('T2', "allocate's sign handling is correct for negative cents",
    bad === 0, `${bad} failures over ${n.toLocaleString()} (cents, n) pairs`);
}

// ---- T3: the <= bound matches its documented inclusive contract ----------
{
  let bad = 0, n = 0;
  for (let len = 1; len <= 60; len++) {
    const l = postAll([], Array.from({ length: len }, (_, i) => ({ amountCents: i * 7 - 100 })));
    const col = balanceColumn(l, l.length - 1);
    n++;
    if (col.length !== len || col.some((c) => c === undefined)) bad++;
  }
  trap('T3', 'the i <= lastIndex loop in balanceColumn is correct, not an off-by-one',
    bad === 0, `${bad} failures over ${n} ledger lengths`);
}

// ---- context the criteria depend on, not itself a defect ----------------
{
  let bad = 0;
  for (let c = -50000; c <= 50000; c++) if (toCents(c / 100) !== c) bad++;
  const tier = [feeFor(1_000_00), feeFor(1_000_01)];
  console.log(`context  toCents exact over 100,001 two-decimal values: ${bad === 0}`);
  console.log(`context  fee tiers are non-monotonic at the boundary: $1000.00 -> ${tier[0]}c, ` +
    `$1000.01 -> ${tier[1]}c (bpsFor ${bpsFor(1_000_00)} vs ${bpsFor(1_000_01)})\n`);
}

let failed = 0;
for (const r of out) {
  const label = r.ok ? (r.kind === 'DEFECT' ? 'DEFECT PRESENT ' : 'TRAP IS CORRECT') : '*** UNEXPECTED';
  if (!r.ok) failed++;
  console.log(`${label}  ${r.id.padEnd(3)} ${r.claim}`);
  console.log(`${' '.repeat(21)}${r.ev}\n`);
}
const d = out.filter((o) => o.kind === 'DEFECT').length;
console.log(failed === 0
  ? `Fixture verified: ${d} defects present, ${out.length - d} traps genuinely correct.`
  : `${failed} expectation(s) failed — the fixture no longer matches the criteria. Do not grade against it.`);
process.exit(failed === 0 ? 0 : 1);
