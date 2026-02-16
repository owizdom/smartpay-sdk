import test from 'node:test';
import assert from 'node:assert/strict';

import { smartPaySDK } from '../smartpay/index.js';

test('smartPaySDK.quoteCheckout throws on null checkout', () => {
  assert.throws(
    () => smartPaySDK.quoteCheckout({ checkout: null, wallet: { balances: [{ symbol: 'ETH', amount: 1 }] } }),
    { message: /checkout.*required/i },
  );
});

test('smartPaySDK.quoteCheckout throws on null wallet', () => {
  assert.throws(
    () => smartPaySDK.quoteCheckout({ checkout: { fixedAmount: 10 }, wallet: null }),
    { message: /wallet.*required/i },
  );
});

test('smartPaySDK.quoteCheckout throws on wallet with empty balances', () => {
  assert.throws(
    () => smartPaySDK.quoteCheckout({ checkout: { fixedAmount: 10 }, wallet: { balances: [] } }),
    { message: /balances/i },
  );
});

test('smartPaySDK.quoteByStrategy throws on missing checkout', () => {
  assert.throws(
    () => smartPaySDK.quoteByStrategy({ wallet: { balances: [{ symbol: 'ETH', amount: 1 }] }, strategy: 'fastest' }),
    { message: /checkout.*required/i },
  );
});
