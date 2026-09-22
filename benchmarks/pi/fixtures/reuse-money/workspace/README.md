# Shop display

Amounts are integer cents. `currency.mjs` owns locale and currency formatting;
`invoice.mjs` renders totals. Receipts need the same behavior.

Run checks: `node --test test.mjs`.
