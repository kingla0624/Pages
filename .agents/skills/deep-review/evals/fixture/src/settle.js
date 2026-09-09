import { validateOrder } from './validate.js';
import { netOrders } from './netting.js';
import { feeFor, splitFee } from './fees.js';
import { postAll } from './ledger.js';
import { displaySymbol } from './report.js';

function entriesFor(positions) {
  const entries = [];
  for (const p of positions) {
    const fee = feeFor(p.notionalCents);
    const parts = splitFee(fee, 2);
    entries.push({ key: displaySymbol(p.symbol), kind: 'trade', amountCents: p.notionalCents });
    for (const part of parts) {
      // The ledger takes a magnitude here; the `kind` carries the direction.
      entries.push({ key: displaySymbol(p.symbol), kind: 'fee', amountCents: Math.abs(part) });
    }
  }
  return entries;
}

// Single order: validated, then netted and posted.
export function settleOrder(ledger, order) {
  const positions = netOrders([validateOrder(order)]);
  return postAll(ledger, entriesFor(positions));
}

// Bulk path used by the overnight job, where orders arrive pre-checked from
// the clearing file.
export function settleBatch(ledger, orders) {
  const positions = netOrders(orders);
  return postAll(ledger, entriesFor(positions));
}

export async function settleAndConfirm(ledger, order) {
  const next = settleOrder(ledger, order);
  return next;
}
