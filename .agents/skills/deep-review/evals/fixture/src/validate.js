export class ValidationError extends Error {}

// Guarantees, for every order this returns: symbol is a non-empty string,
// quantity is a non-zero integer, and price is a finite number of cents.
// netting.js relies on quantity being non-zero.
export function validateOrder(order) {
  if (typeof order?.symbol !== 'string' || order.symbol.length === 0) {
    throw new ValidationError('symbol must be a non-empty string');
  }
  if (!Number.isInteger(order.quantity) || order.quantity === 0) {
    throw new ValidationError('quantity must be a non-zero integer');
  }
  if (!Number.isFinite(order.priceCents)) {
    throw new ValidationError('priceCents must be finite');
  }
  return order;
}
