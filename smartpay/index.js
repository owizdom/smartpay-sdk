import {
  createDemoWallet,
  createWalletContext,
  normalizeNetworkMap,
  resolveChainForToken,
  TOKENS,
  NETWORKS,
  SUPPORTED_METHODS,
  defaultDemoWalletBalances,
  shortAddress,
  money,
  tokenAmount,
  roundMoney,
  routePriorityHint,
  resolveTokenCatalog,
  normalizeAddress,
  normalizeTokenList,
  isLikelyEvmAddress,
  sanitizeAmount,
  ensureWithinRange,
} from './core.js';
import { quoteCheckoutRoutes } from './routeEngine.js';
import { executeRoute } from './executionEngine.js';

export { HotSmartPaySDK, hotSmartPaySDK } from './hotSmartPaySDK.js';
export { executeRoute } from './executionEngine.js';
export { createDemoRoutes, quoteCheckoutRoutes, rankRoutes } from './routeEngine.js';
export { buildOmniRouteCandidates, rankCandidates } from './adapters/omniRouterAdapter.js';
export { validateWithHotValidation, HotValidationAdapter } from './adapters/hotValidationAdapter.js';
export {
  TOKENS,
  NETWORKS,
  SUPPORTED_METHODS,
  createDemoWallet,
  createWalletContext,
  normalizeNetworkMap,
  resolveChainForToken,
  defaultDemoWalletBalances,
  shortAddress,
  money,
  tokenAmount,
  roundMoney,
  routePriorityHint,
  resolveTokenCatalog,
  normalizeAddress,
  normalizeTokenList,
  isLikelyEvmAddress,
  sanitizeAmount,
  ensureWithinRange,
} from './core.js';

export const smartPaySDK = {
  buildDemoWallet: createDemoWallet,
  quoteCheckout: ({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }) =>
    quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }),
  quoteByStrategy: ({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }) =>
    quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }).byStrategy?.[strategy] || [],
  execute: ({ route, wallet, ...executionOptions }) => executeRoute(route, { wallet, ...executionOptions }),
};

export const SDK_VERSION = '0.1.0';
