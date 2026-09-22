export function formatMoney(cents, { locale = 'en-US', currency = 'USD' } = {}) {
  if (!Number.isSafeInteger(cents)) throw new TypeError('Expected integer cents');
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
