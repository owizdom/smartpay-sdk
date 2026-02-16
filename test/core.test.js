import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  roundMoney,
  shortAddress,
  money,
  tokenAmount,
  sanitizeAmount,
  normalizeAddress,
  isLikelyEvmAddress,
  normalizeTokenList,
  ensureWithinRange,
  TOKENS,
  NETWORKS,
  SUPPORTED_METHODS,
  createDemoWallet,
} from '../smartpay/index.js';

test('clamp constrains value within min and max', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test('roundMoney rounds to 6 decimal places', () => {
  assert.equal(roundMoney(1.123456789), 1.123457);
  assert.equal(roundMoney(0), 0);
  assert.equal(roundMoney(null), 0);
  assert.equal(roundMoney(undefined), 0);
});

test('shortAddress truncates correctly', () => {
  assert.equal(shortAddress('0x1234567890abcdef1234567890abcdef12345678'), '0x1234...5678');
  assert.equal(shortAddress(''), '');
  assert.equal(shortAddress(), '');
});

test('sanitizeAmount returns parsed number or fallback', () => {
  assert.equal(sanitizeAmount(42), 42);
  assert.equal(sanitizeAmount('100'), 100);
  assert.equal(sanitizeAmount('not-a-number'), 0);
  assert.equal(sanitizeAmount('not-a-number', 5), 5);
  // Number(null) === 0, which is finite, so it returns 0 (not the fallback)
  assert.equal(sanitizeAmount(null), 0);
});

test('normalizeAddress lowercases', () => {
  assert.equal(normalizeAddress('0xAbCdEf'), '0xabcdef');
  assert.equal(normalizeAddress(null), '');
  assert.equal(normalizeAddress(undefined), '');
});

test('isLikelyEvmAddress validates EVM addresses', () => {
  assert.equal(isLikelyEvmAddress('0x1111111111111111111111111111111111111111'), true);
  assert.equal(isLikelyEvmAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), true);
  assert.equal(isLikelyEvmAddress('0x123'), false);
  assert.equal(isLikelyEvmAddress('not-an-address'), false);
  assert.equal(isLikelyEvmAddress(''), false);
  assert.equal(isLikelyEvmAddress(), false);
});

test('normalizeTokenList deduplicates and uppercases', () => {
  const result = normalizeTokenList(['eth', 'usdc', 'ETH', 'usdc']);
  assert.deepEqual(result, ['ETH', 'USDC']);
});

test('ensureWithinRange clamps sanitized value', () => {
  assert.equal(ensureWithinRange(5, 1, 10), 5);
  assert.equal(ensureWithinRange(-5, 1, 10), 1);
  assert.equal(ensureWithinRange(100, 1, 10), 10);
  assert.equal(ensureWithinRange('not-a-number', 1, 10), 1);
});

test('TOKENS has required entries', () => {
  assert.ok(TOKENS.eth);
  assert.ok(TOKENS.usdc);
  assert.ok(TOKENS.usdt);
  assert.equal(TOKENS.eth.symbol, 'ETH');
  assert.equal(TOKENS.usdc.decimals, 6);
  assert.equal(TOKENS.usdt.decimals, 6);
});

test('NETWORKS has ethereum and base', () => {
  assert.ok(NETWORKS.ethereum);
  assert.ok(NETWORKS.base);
  assert.equal(NETWORKS.ethereum.id, 1);
  assert.equal(NETWORKS.base.id, 8453);
});

test('createDemoWallet returns valid wallet structure', () => {
  const wallet = createDemoWallet();
  assert.ok(wallet.address);
  assert.ok(Array.isArray(wallet.balances));
  assert.ok(wallet.balances.length > 0);
  assert.equal(wallet.isDemo, true);
  assert.ok(wallet.network);
});

test('createDemoWallet accepts custom address', () => {
  const wallet = createDemoWallet({ address: '0xcustom' });
  assert.equal(wallet.address, '0xcustom');
});

test('SUPPORTED_METHODS includes ETH, USDC, USDT', () => {
  assert.ok(SUPPORTED_METHODS.includes('ETH'));
  assert.ok(SUPPORTED_METHODS.includes('USDC'));
  assert.ok(SUPPORTED_METHODS.includes('USDT'));
});
