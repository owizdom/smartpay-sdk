import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoWallet, executeRoute, smartPaySDK, hotSmartPaySDK } from '../smartpay/index.js';

const validWallet = createDemoWallet({
  address: '0x1111111111111111111111111111111111111111',
});

function makeRoute(overrides = {}) {
  return {
    id: 'route-001',
    sourceSymbol: 'ETH',
    sourceChain: 'ethereum',
    sourceChainId: 1,
    sourceAmount: 0.12,
    settlementSymbol: 'USDC',
    settlementChain: 'ethereum',
    settlementChainId: 1,
    feesTotalUsd: 1.2,
    settlementAmountUsd: 79.5,
    finalPayableUsd: 80.7,
    settlementAmount: 79.5,
    strategy: 'balanced',
    executable: true,
    ...overrides,
  };
}

test('executeRoute resolves transport via transportResolver and returns tx hash', async () => {
  const route = makeRoute();

  const transport = {
    async executeRoute({ route: executionRoute }) {
      assert.equal(executionRoute.id, route.id);
      return '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab';
    },
  };

  const result = await executeRoute(route, {
    wallet: validWallet,
    transportResolver: () => transport,
    forceExecution: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.txHash, '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab');
  assert.equal(result.routeId, route.id);
});

test('executeRoute falls back to deterministic simulation when no transport is provided', async () => {
  const route = makeRoute({ id: 'route-sim', executable: false });
  const result = await executeRoute(route, {
    wallet: validWallet,
    toAddress: '0x2222222222222222222222222222222222222222',
    forceExecution: false,
    simulationFailureRate: 0,
    delayMs: 1,
  });

  assert.equal(result.ok, true);
  assert.ok(result.txHash);
  assert.match(result.txHash, /^0x[a-f0-9]{64}$/);
});

test('executeRoute uses wallet transport fallback when chain transport map is not passed', async () => {
  const route = makeRoute({ id: 'route-wallet-transport' });
  const walletTransport = {
    request: async ({ method }) => {
      assert.equal(method, 'eth_sendTransaction');
      return '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    },
  };
  const wallet = createDemoWallet({
    address: '0x3333333333333333333333333333333333333333',
    transports: {
      ethereum: walletTransport,
    },
  });

  const result = await executeRoute(route, {
    wallet,
    forceExecution: true,
    toAddress: '0x4444444444444444444444444444444444444444',
    delayMs: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.txHash, '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
});

test('hotSmartPaySDK.execute returns validation failure for invalid wallet address', async () => {
  const checkout = {
    id: 'checkout-validation',
    name: 'Validation Product',
    priceMode: 'fixed',
    fixedAmount: 12.5,
    settlementAsset: 'USDC',
    acceptedPaymentMethods: ['ETH'],
  };

  const wallet = createDemoWallet();
  const quote = await smartPaySDK.quoteCheckout({
    checkout,
    wallet,
    strategy: 'fastest',
  });

  const badWallet = { address: 'not-a-wallet' };

  const result = await hotSmartPaySDK.execute({
    route: quote.selected,
    wallet: badWallet,
    toAddress: '0x5555555555555555555555555555555555555555',
    forceExecution: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'validation_failed');
  assert.equal(result.failureReason, 'Wallet address is not a valid EVM address.');
});

