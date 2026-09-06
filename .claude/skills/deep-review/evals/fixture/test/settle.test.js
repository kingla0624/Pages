import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, allocate } from '../src/money.js';
import { bpsFor, feeFor } from '../src/fees.js';
import { netOrders } from '../src/netting.js';
import { post, postAll, isBalanced, balanceOf } from '../src/ledger.js';
import { formatUsd } from '../src/report.js';
import { validateOrder, ValidationError } from '../src/validate.js';
import { settleOrder } from '../src/settle.js';

test('cents round-trip', () => {
  assert.equal(toCents(12.34), 1234);
  assert.equal(fromCents(1234), 12.34);
});

test('allocate splits evenly and sums back', () => {
  assert.deepEqual(allocate(100, 4), [25, 25, 25, 25]);
  assert.deepEqual(allocate(101, 4), [26, 25, 25, 25]);
});

test('fee tiers', () => {
  assert.equal(bpsFor(50_000), 25);
  assert.equal(bpsFor(5_000_00), 12);
  assert.equal(feeFor(100_000), 250);
});

test('netting collapses one symbol', () => {
  const out = netOrders([
    { symbol: 'ACME', quantity: 10, priceCents: 500 },
    { symbol: 'ACME', quantity: 5, priceCents: 600 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].quantity, 15);
});

test('ledger tracks a running balance', () => {
  const l = postAll([], [{ amountCents: 100 }, { amountCents: -30 }]);
  assert.equal(balanceOf(l), 70);
  assert.equal(isBalanced(l), true);
});

test('validation rejects a zero quantity', () => {
  assert.throws(() => validateOrder({ symbol: 'A', quantity: 0, priceCents: 1 }), ValidationError);
});

test('formats usd', () => {
  assert.equal(formatUsd(-1234), '-$12.34');
});

test('settling one order posts entries', () => {
  const l = settleOrder([], { symbol: 'ACME', quantity: 10, priceCents: 500 });
  assert.equal(l.length, 3);
});
