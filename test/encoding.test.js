import test from 'node:test';
import assert from 'node:assert/strict';

import { toHexString } from '../smartpay/internal/encoding.js';

test('toHexString converts integer amounts correctly', () => {
  // 1 ETH = 1 * 10^18 = 0xde0b6b3a7640000
  assert.equal(toHexString(1, 18), '0xde0b6b3a7640000');
});

test('toHexString converts decimal amounts correctly', () => {
  // 0.5 ETH = 5 * 10^17 = 0x6f05b59d3b20000
  assert.equal(toHexString(0.5, 18), '0x6f05b59d3b20000');
});

test('toHexString handles USDC with 6 decimals', () => {
  // 100 USDC = 100 * 10^6 = 100000000 = 0x5f5e100
  assert.equal(toHexString(100, 6), '0x5f5e100');
});

test('toHexString handles fractional USDC', () => {
  // 1.5 USDC = 1500000 = 0x16e360
  assert.equal(toHexString(1.5, 6), '0x16e360');
});

test('toHexString returns 0x0 for NaN', () => {
  assert.equal(toHexString('not-a-number'), '0x0');
  assert.equal(toHexString(NaN), '0x0');
});

test('toHexString returns 0x0 for Infinity', () => {
  assert.equal(toHexString(Infinity), '0x0');
});

test('toHexString handles zero', () => {
  assert.equal(toHexString(0, 18), '0x0');
});

test('toHexString handles large ETH amounts without precision loss', () => {
  // 1000 ETH = 1000 * 10^18
  const result = toHexString(1000, 18);
  // 1000 * 10^18 = 3635C9ADC5DEA00000 in hex
  assert.equal(result, '0x3635c9adc5dea00000');
});

test('toHexString handles 0 decimals', () => {
  assert.equal(toHexString(42, 0), '0x2a');
});
