import { createDemoWallet, TOKENS, NETWORKS, SUPPORTED_METHODS, defaultDemoWalletBalances, shortAddress, money, tokenAmount, roundMoney, routePriorityHint, resolveTokenCatalog, normalizeAddress, normalizeTokenList, isLikelyEvmAddress, sanitizeAmount, ensureWithinRange } from './core.js';
import { quoteCheckoutRoutes } from './routeEngine.js';
import { executeRoute } from './executionEngine.js';

export { HotSmartPaySDK, hotSmartPaySDK } from './hotSmartPaySDK.js';
export { createDemoRoutes, quoteCheckoutRoutes, rankRoutes } from './routeEngine.js';
export { buildOmniRouteCandidates, rankCandidates } from './adapters/omniRouterAdapter.js';
export { validateWithHotValidation, HotValidationAdapter } from './adapters/hotValidationAdapter.js';
export {
  TOKENS,
  NETWORKS,
  SUPPORTED_METHODS,
  createDemoWallet,
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
  quoteCheckout: ({ checkout, wallet, amountInput, strategy }) => quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy }),
  quoteByStrategy: ({ checkout, wallet, amountInput, strategy }) =>
    quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy }).byStrategy?.[strategy] || [],
  execute: ({ route, wallet }) => executeRoute(route, { wallet }),
};

export const SDK_VERSION = '0.1.0';
