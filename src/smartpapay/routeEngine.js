import { buildOmniRouteCandidates, rankCandidates } from './adapters/omniRouterAdapter.js';
import { roundMoney, resolveTokenCatalog, ensureWithinRange, SUPPORTED_METHODS } from './core.js';

const DEFAULT_STRATEGIES = ['fastest', 'cheapest', 'balanced'];
const STRATEGY_DISCOUNTS = {
  fastest: 0.0,
  balanced: 0.012,
  cheapest: 0.028,
};
const STRATEGY_LABELS = {
  fastest: { badge: 'Fastest', title: 'Fastest' },
  cheapest: { badge: 'Cheapest', title: 'Cheapest' },
  balanced: { badge: 'Balanced', title: 'Balanced' },
};

export function buildRouteContext({ checkout, wallet, strategy = 'balanced', amountUsd }) {
  const { tokens } = resolveTokenCatalog();
  const accepted = Array.isArray(checkout?.acceptedPaymentMethods)
    ? checkout.acceptedPaymentMethods
    : SUPPORTED_METHODS.slice();

  const settlementSymbol = String(checkout?.settlementAsset || checkout?.settlementToken || 'USDC').toUpperCase();
  const base = Number(amountUsd || checkout?.fixedAmount || checkout?.variableMin || 0);
  const settlement = tokens.find((token) => token.symbol.toUpperCase() === settlementSymbol) || tokens[0] || null;

  return {
    invoiceUsd: Math.max(0.5, Number.isFinite(base) ? base : 0.5),
    settlementToken: settlement,
    wallet: {
      ...wallet,
      balances: wallet?.balances || [],
      tokenCatalog: tokens,
    },
    acceptedPaymentMethods: accepted.map((item) => String(item || '').toUpperCase()),
    strategy,
  };
}

export function createDemoRoutes({ invoiceUsd, settlementTokenSymbol, wallet, preference = 'balanced', acceptedPaymentMethods = [] }) {
  const context = buildRouteContext({
    checkout: { settlementAsset: settlementTokenSymbol, acceptedPaymentMethods },
    wallet,
    strategy: preference,
    amountUsd: invoiceUsd,
  });

  if (!context.wallet || !wallet?.balances?.length) {
    return [];
  }

  const candidates = buildOmniRouteCandidates(context);
  const ranked = rankCandidates(candidates, preference);
  return ranked.slice(0, 6).map((route, idx) => ({
    ...route,
    strategy: context.strategy,
    preference: context.strategy,
    routeScore: route.score,
    routeHint: STRATEGY_LABELS[context.strategy] || STRATEGY_LABELS.balanced,
    uiFeeBias: idx + 1,
  }));
}

export { rankCandidates as rankRoutes };

function pickBestCandidate(routes) {
  if (!routes.length) {
    return null;
  }

  return routes.reduce((best, route) => {
    if (!best) {
      return route;
    }

    const baseCost = route.finalPayableUsd + route.etaMinutes * 0.12;
    const bestCost = best.finalPayableUsd + best.etaMinutes * 0.12;
    return baseCost < bestCost ? route : best;
  }, null);
}

export function quoteCheckoutRoutes({ checkout, wallet, amountInput = null, strategy = 'balanced' }) {
  const baseAmount = checkout.priceMode === 'variable' ? amountInput || checkout.variableMin || 0 : checkout.fixedAmount || 0;
  const normalizedAmount = ensureWithinRange(
    baseAmount,
    0.5,
    Math.max(999999, Number(baseAmount) || 1_000_000),
  );

  const routesByStrategy = {};
  const strategies = DEFAULT_STRATEGIES;
  const commonInput = {
    checkout,
    wallet,
    amountUsd: normalizedAmount,
  };
  const commonContext = buildRouteContext(commonInput);

  strategies.forEach((current) => {
    const candidates = buildOmniRouteCandidates({ ...commonContext, preference: current, strategy: current });
    const ranked = rankCandidates(candidates, current);

    routesByStrategy[current] = ranked.map((route) =>
      enrichRoute(route, commonInput, current),
    );
  });

  const bestRoute = pickBestCandidate([...routesByStrategy.fastest, ...routesByStrategy.cheapest, ...routesByStrategy.balanced]);

  return {
    invoiceUsd: normalizedAmount,
    selected: bestRoute,
    byStrategy: routesByStrategy,
  };
}

function addUiDiscount(route, strategy, invoiceUsd) {
  const discount = STRATEGY_DISCOUNTS[strategy] || 0;
  const discountUsd = Math.max(0.12, invoiceUsd * discount);
  const displayFee = Math.max(0.35, Number(route.feesTotalUsd || 0) - discountUsd);
  const displayEta = Math.max(30, Number(route.etaMinutes || 0) * 60 * (strategy === 'fastest' ? 0.86 : 1));
  const confidence = Math.min(
    99,
    Math.max(84, Math.round((route.reliability || 0.94) * 100) + (strategy === 'cheapest' ? 2 : 0)),
  );
  const displayTotal = roundMoney(invoiceUsd + displayFee);

  return {
    ...route,
    displayFeeUsd: roundMoney(displayFee),
    displayTotalUsd: displayTotal,
    displayEtaMinutes: Number((displayEta / 60).toFixed(2)),
    displayConfidence: confidence,
    recommendationHint: STRATEGY_LABELS[strategy] || STRATEGY_LABELS.balanced,
  };
}

function enrichRoute(route, { checkout = {} }, strategy) {
  const invoiceUsd = Number(checkout.fixedAmount || checkout.variableMin || checkout.variableMax || 0);
  return {
    ...addUiDiscount(route, strategy, invoiceUsd || 1),
    strategy,
    settlementSymbol: (route.settlementSymbol || checkout.settlementAsset || 'USDC').toUpperCase(),
    settlementChain: route.settlementChain || 'ethereum',
    routeMeta: {
      ...(route.routeMeta || {}),
      strategy,
      generatedAt: new Date().toISOString(),
    },
  };
}
