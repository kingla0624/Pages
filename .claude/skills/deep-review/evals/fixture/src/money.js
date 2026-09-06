// All money in this package is integer cents. Nothing downstream should ever
// see a fractional cent.

export function toCents(dollars) {
  return Math.round(dollars * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

// Split `cents` into `n` parts as evenly as possible. The remainder goes to the
// earliest parts, so the parts always sum back to exactly `cents` — including
// when `cents` is negative (a rebate), where the parts are negative too.
export function allocate(cents, n) {
  const base = Math.trunc(cents / n);
  const remainder = cents - base * n;
  const step = Math.sign(remainder);
  return Array.from({ length: n }, (_, i) =>
    base + (i < Math.abs(remainder) ? step : 0));
}
