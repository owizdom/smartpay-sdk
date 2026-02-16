import test from 'node:test';
import assert from 'node:assert/strict';

import { HotValidationAdapter, validateWithHotValidation } from '../smartpay/adapters/hotValidationAdapter.js';

test('validateCheckoutPayload passes with valid payload', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    checkoutId: 'checkout-001',
    amountUsd: 50,
    settlementToken: 'USDC',
    acceptedPaymentMethods: ['ETH', 'USDC'],
    walletAddress: '0x1111111111111111111111111111111111111111',
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'validated');
});

test('validateCheckoutPayload fails with missing checkoutId and walletAddress', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    amountUsd: 50,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_request');
});

test('validateCheckoutPayload fails with zero amount', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    checkoutId: 'checkout-001',
    amountUsd: 0,
    walletAddress: '0x1111111111111111111111111111111111111111',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_amount');
});

test('validateCheckoutPayload fails with negative amount', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    checkoutId: 'checkout-001',
    amountUsd: -10,
    walletAddress: '0x1111111111111111111111111111111111111111',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_amount');
});

test('validateCheckoutPayload fails with invalid wallet address', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    checkoutId: 'checkout-001',
    amountUsd: 50,
    walletAddress: 'not-a-wallet',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_wallet');
});

test('validateCheckoutPayload fails with short wallet address', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateCheckoutPayload({
    checkoutId: 'checkout-001',
    amountUsd: 50,
    walletAddress: '0x1234',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_wallet');
});

test('validateWithHotValidation convenience function works', async () => {
  const result = await validateWithHotValidation({
    id: 'checkout-001',
    amountUsd: 25,
    walletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.ok, true);
});

test('validateWalletCanPay returns ok in local mode', async () => {
  const adapter = new HotValidationAdapter();
  const result = await adapter.validateWalletCanPay(
    '0x1111111111111111111111111111111111111111',
    'USDC',
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, 'simulated_ok');
});
