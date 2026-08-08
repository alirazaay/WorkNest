import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, moneyFromCents } from '../src/modules/payroll/money.js';

test('payroll money uses exact integer cents conversion', () => {
  assert.equal(cents('100.10'), 10010);
  assert.equal(cents('0.99'), 99);
  assert.equal(moneyFromCents(123456), '1234.56');
});

test('payroll money rejects malformed values', () => {
  assert.throws(() => cents('1.234'));
  assert.throws(() => cents('-1'));
});
