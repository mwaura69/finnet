import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validPassword, SingleFlight, isPublicAuthRequest } from '../src/app/core/session';
test('password policy enforces mixed characters and UTF8 byte bound', () => {
  assert.equal(validPassword('Test123!'), true);
  for (const value of [
    'short1!',
    'alllower1!',
    'ALLUPPER1!',
    'NoNumbers!',
    'NoSymbol123',
    'Aa1!' + 'é'.repeat(40),
  ])
    assert.equal(validPassword(value), false);
});
test('concurrent refresh requests share one operation and reset after completion', async () => {
  const flight = new SingleFlight<number>();
  let calls = 0;
  const work = async () => {
    calls++;
    return 1;
  };
  await Promise.all([flight.run(work), flight.run(work), flight.run(work)]);
  assert.equal(calls, 1);
  await flight.run(work);
  assert.equal(calls, 2);
  assert.equal(isPublicAuthRequest('/auth/refresh'), true);
  assert.equal(isPublicAuthRequest('/portfolios'), false);
});
