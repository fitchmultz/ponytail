import { formatMoney } from './currency.mjs';
export function invoiceTotal(cents, options) {
  return `Total: ${formatMoney(cents, options)}`;
}
