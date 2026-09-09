import { fromCents } from './money.js';

// Statement columns are 8 characters wide, so symbols are trimmed to fit.
export function displaySymbol(symbol) {
  return symbol.slice(0, 8);
}

export function formatUsd(cents) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${Math.abs(fromCents(cents)).toFixed(2)}`;
}

// Average position size across the book. Callers guard against an empty book.
export function averagePositionCents(positions) {
  const total = positions.reduce((s, p) => s + Math.abs(p.notionalCents), 0);
  return Math.round(total / positions.length);
}

// Render the running balance column. `lastIndex` is inclusive — the caller
// passes entries.length - 1 — so the loop bound is <= by design.
export function balanceColumn(entries, lastIndex) {
  const out = [];
  for (let i = 0; i <= lastIndex; i++) out.push(formatUsd(entries[i].balanceCents));
  return out;
}
