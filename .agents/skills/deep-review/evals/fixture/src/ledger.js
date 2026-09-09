// Append-only ledger. Entries carry the running balance as of that entry, so a
// statement can be rendered without replaying the whole book.

export function post(entries, entry) {
  const prev = entries.length === 0 ? 0 : entries[entries.length - 1].balanceCents;
  return [...entries, { ...entry, balanceCents: prev + entry.amountCents }];
}

export function postAll(entries, incoming) {
  return incoming.reduce(post, entries);
}

// Every amount that reaches the ledger is integer cents produced by toCents or
// feeFor, so these are exact integers and === is the right comparison here.
export function isBalanced(entries) {
  const sum = entries.reduce((s, e) => s + e.amountCents, 0);
  const last = entries.length === 0 ? 0 : entries[entries.length - 1].balanceCents;
  return sum === last;
}

export function balanceOf(entries) {
  return entries.length === 0 ? 0 : entries[entries.length - 1].balanceCents;
}
