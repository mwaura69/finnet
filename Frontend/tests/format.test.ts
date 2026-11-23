import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, signedMoney, percentage, csvCell } from '../src/app/core/format';
test('currencies stay explicit and returns always include a sign', () => {
  assert.equal(money(1250000, 'KES'), 'KES 1,250,000.00');
  assert.equal(money(40.5, 'USD'), 'USD 40.50');
  assert.equal(signedMoney(-10, 'KES'), '−KES 10.00');
  assert.equal(percentage(20, 100), '+20.00%');
  assert.equal(percentage(0, 0), '+0.00%');
});
test('CSV escaping neutralizes spreadsheet formulas and quotes values', () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell('A,B'), '"A,B"');
});
