// Nets orders down to one position per symbol.
//
// Callers must pass orders that have been through validateOrder: this divides
// by the net quantity to get an average price, so a net of zero would blow up.
// Symbols come back in sorted order for stable statements.
export function netOrders(orders) {
  const bySymbol = new Map();
  for (const o of orders) {
    const cur = bySymbol.get(o.symbol) ?? { symbol: o.symbol, quantity: 0, notionalCents: 0 };
    cur.quantity += o.quantity;
    cur.notionalCents += o.quantity * o.priceCents;
    bySymbol.set(o.symbol, cur);
  }
  return [...bySymbol.values()]
    .map((p) => ({ ...p, avgPriceCents: Math.round(p.notionalCents / p.quantity) }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
