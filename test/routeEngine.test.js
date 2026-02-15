import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDemoWallet,
  quoteCheckoutRoutes,
} from '../smartpay/index.js';

test('quoteCheckoutRoutes returns grouped strategy quotes and selected route', () => {
  const checkout = {
    id: 'checkout-001',
    name: 'Starter Pack',
    priceMode: 'fixed',
    fixedAmount: 79.5,
    settlementAsset: 'USDC',
    acceptedPaymentMethods: ['ETH', 'USDC', 'USDT'],
  };

  const wallet = createDemoWallet();
  const result = quoteCheckoutRoutes({ checkout, wallet, strategy: 'balanced' });

  assert.equal(result.invoiceUsd, 79.5);
  assert.ok(result.selected, 'engine should choose a selected route');
  assert.ok(result.byStrategy.fastest?.length > 0, 'fastest should produce routes');
  assert.ok(result.byStrategy.cheapest?.length > 0, 'cheapest should produce routes');
  assert.ok(result.byStrategy.balanced?.length > 0, 'balanced should produce routes');

  const selected = result.selected;
  assert.ok(selected.sourceSymbol);
  assert.ok(selected.settlementSymbol);
  assert.ok(Number(selected.finalPayableUsd) >= Number(selected.settlementAmountUsd));
  assert.ok(selected.displayFeeUsd >= 0.35);
});

