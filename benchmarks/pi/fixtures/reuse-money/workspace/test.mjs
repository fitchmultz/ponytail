import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = name => import(pathToFileURL(resolve(process.env.FIXTURE_WORKSPACE || '.', name)));
const { formatMoney } = await load('currency.mjs');
const { invoiceTotal } = await load('invoice.mjs');
const { receiptLine } = await load('receipt.mjs');

test('receipts and invoices retain the shared international formatting contract', () => {
  for (const options of [{ locale: 'en-US', currency: 'USD' }, { locale: 'de-DE', currency: 'EUR' }, { locale: 'ja-JP', currency: 'JPY' }]) {
    for (const priceCents of [0, 12345, -120, 9007199254740991]) {
      const expected = new Intl.NumberFormat(options.locale, { style: 'currency', currency: options.currency }).format(priceCents / 100);
      assert.equal(formatMoney(priceCents, options), expected);
      assert.equal(invoiceTotal(priceCents, options), `Total: ${expected}`);
      assert.equal(receiptLine({ name: 'Coffee', priceCents }, options), `Coffee: ${expected}`);
    }
  }
  assert.equal(receiptLine({ name: 'Tea', priceCents: 250 }), 'Tea: $2.50');
});
test('invalid amounts and currency options retain errors on every surface', () => {
  for (const cents of [NaN, Infinity, 1.5, '200', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => formatMoney(cents), TypeError);
    assert.throws(() => invoiceTotal(cents), TypeError);
    assert.throws(() => receiptLine({ name: 'Tea', priceCents: cents }), TypeError);
  }
  assert.throws(() => receiptLine({ name: 'Tea', priceCents: 200 }, { currency: 'INVALID' }), RangeError);
});
