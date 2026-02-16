import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOmniRouteCandidates, rankCandidates } from '../smartpay/adapters/omniRouterAdapter.js';
import { TOKENS, NETWORKS } from '../smartpay/core.js';

const tokens = Object.values(TOKENS);

function makeContext(overrides = {}) {
  return {
    invoiceUsd: 50,
    settlementToken: TOKENS.usdc,
    wallet: {
      balances: [
        { key: 'eth', symbol: 'ETH', chain: 'ethereum', decimals: 18, chainId: 1, amount: 5 },
        { key: 'usdc', symbol: 'USDC', chain: 'ethereum', decimals: 6, chainId: 1, amount: 10000 },
        { key: 'usdt', symbol: 'USDT', chain: 'ethereum', decimals: 6, chainId: 1, amount: 5000 },
      ],
      tokenCatalog: tokens,
    },
    acceptedPaymentMethods: ['ETH', 'USDC', 'USDT'],
    strategy: 'balanced',
    networks: NETWORKS,
    ...overrides,
  };
}

test('buildOmniRouteCandidates returns candidates for each matching token balance', () => {
  const candidates = buildOmniRouteCandidates(makeContext());
  assert.ok(candidates.length === 3, `expected 3 candidates, got ${candidates.length}`);

  const symbols = candidates.map((c) => c.sourceSymbol);
  assert.ok(symbols.includes('ETH'));
  assert.ok(symbols.includes('USDC'));
  assert.ok(symbols.includes('USDT'));
});

test('buildOmniRouteCandidates respects acceptedPaymentMethods filter', () => {
  const candidates = buildOmniRouteCandidates(makeContext({ acceptedPaymentMethods: ['USDC'] }));
  assert.ok(candidates.length === 1);
  assert.equal(candidates[0].sourceSymbol, 'USDC');
});

test('buildOmniRouteCandidates skips zero-balance tokens', () => {
  const context = makeContext();
  context.wallet.balances = [
    { key: 'eth', symbol: 'ETH', chain: 'ethereum', decimals: 18, chainId: 1, amount: 0 },
    { key: 'usdc', symbol: 'USDC', chain: 'ethereum', decimals: 6, chainId: 1, amount: 10000 },
  ];
  const candidates = buildOmniRouteCandidates(context);
  assert.ok(candidates.length === 1);
  assert.equal(candidates[0].sourceSymbol, 'USDC');
});

test('buildOmniRouteCandidates returns empty array for empty wallet', () => {
  const context = makeContext();
  context.wallet.balances = [];
  const candidates = buildOmniRouteCandidates(context);
  assert.ok(Array.isArray(candidates));
  assert.equal(candidates.length, 0);
});

test('rankCandidates fastest strategy ranks lower-ETA routes higher', () => {
  const candidates = [
    { feesTotalUsd: 5, etaMinutes: 1, reliability: 0.99, settlementAmountUsd: 50 },
    { feesTotalUsd: 2, etaMinutes: 10, reliability: 0.99, settlementAmountUsd: 50 },
  ];
  const ranked = rankCandidates(candidates, 'fastest');
  // With fastest weights (eta: 0.82), the low-ETA route should rank first
  assert.equal(ranked[0].etaMinutes, 1, 'fastest strategy should prefer lower ETA');
});

test('rankCandidates cheapest strategy ranks lower-fee routes higher', () => {
  const candidates = [
    { feesTotalUsd: 10, etaMinutes: 1, reliability: 0.99, settlementAmountUsd: 50 },
    { feesTotalUsd: 1, etaMinutes: 10, reliability: 0.99, settlementAmountUsd: 50 },
  ];
  const ranked = rankCandidates(candidates, 'cheapest');
  // With cheapest weights (fee: 0.82), the low-fee route should rank first
  assert.equal(ranked[0].feesTotalUsd, 1, 'cheapest strategy should prefer lower fees');
});

test('rankCandidates assigns rank and isBest correctly', () => {
  const candidates = [
    { feesTotalUsd: 3, etaMinutes: 2, reliability: 0.97, settlementAmountUsd: 50 },
    { feesTotalUsd: 1, etaMinutes: 5, reliability: 0.99, settlementAmountUsd: 50 },
  ];
  const ranked = rankCandidates(candidates, 'balanced');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].isBest, true);
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[1].isBest, false);
});

test('each candidate has required route fields', () => {
  const candidates = buildOmniRouteCandidates(makeContext());
  for (const c of candidates) {
    assert.ok(c.id, 'route must have id');
    assert.ok(c.sourceSymbol, 'route must have sourceSymbol');
    assert.ok(c.sourceChain, 'route must have sourceChain');
    assert.ok(typeof c.feesTotalUsd === 'number', 'feesTotalUsd must be a number');
    assert.ok(typeof c.etaMinutes === 'number', 'etaMinutes must be a number');
    assert.ok(typeof c.reliability === 'number', 'reliability must be a number');
    assert.ok(c.reliability >= 0.9 && c.reliability <= 1, 'reliability must be between 0.9 and 1');
  }
});
