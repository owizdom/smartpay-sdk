import test from 'node:test';
import assert from 'node:assert/strict';

import { smartPaySDK } from '../smartpay/index.js';

test('smartPaySDK.quoteByStrategy returns strategy list for requested strategy', () => {
  const wallet = {
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    chain: 'ethereum',
    chainId: 1,
    balances: [
      { key: 'eth', symbol: 'ETH', chain: 'ethereum', decimals: 18, chainId: 1, amount: 10 },
      { key: 'usdc', symbol: 'USDC', chain: 'ethereum', decimals: 6, chainId: 1, amount: 5000 },
    ],
  };
  const checkout = {
    id: 'checkout-index',
    name: 'Starter',
    priceMode: 'fixed',
    fixedAmount: 10,
    settlementAsset: 'USDC',
    acceptedPaymentMethods: ['ETH', 'USDC'],
  };

  const routes = smartPaySDK.quoteByStrategy({
    checkout,
    wallet,
    strategy: 'cheapest',
  });

  assert.ok(Array.isArray(routes));
  assert.ok(routes.length > 0);
  assert.equal(routes.every((route) => route.strategy === 'cheapest'), true);
});

