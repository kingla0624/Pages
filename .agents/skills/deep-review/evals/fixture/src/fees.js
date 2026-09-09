import { allocate } from './money.js';

const TIERS = [
  { upTo: 1_000_00, bps: 25 },
  { upTo: 100_000_00, bps: 12 },
  { upTo: Infinity, bps: 6 },
];

export function bpsFor(notionalCents) {
  const n = Math.abs(notionalCents);
  // TIERS is ordered and its last entry is Infinity, so this always returns.
  return TIERS.find((t) => n <= t.upTo).bps;
}

// Fee on a notional, in cents. Negative notional means a rebate, and the fee
// keeps that sign so the ledger nets out.
export function feeFor(notionalCents) {
  const bps = bpsFor(notionalCents);
  return Math.round(notionalCents * bps / 10_000);
}

// Split one fee across the legs that caused it.
export function splitFee(feeCents, legCount) {
  return allocate(feeCents, legCount);
}
