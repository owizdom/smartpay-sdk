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
  SUPPORTED_CHAINS,
  clamp,
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

function validateQuoteInput(checkout, wallet) {
  if (!checkout || typeof checkout !== 'object') {
    throw new Error('SmartPay: "checkout" is required and must be an object.');
  }
  if (!wallet || typeof wallet !== 'object') {
    throw new Error('SmartPay: "wallet" is required and must be an object.');
  }
  if (!Array.isArray(wallet.balances) || wallet.balances.length === 0) {
    throw new Error('SmartPay: wallet must have a non-empty "balances" array.');
  }
}

export const smartPaySDK = {
  buildDemoWallet: createDemoWallet,
  quoteCheckout: ({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }) => {
    validateQuoteInput(checkout, wallet);
    return quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions });
  },
  quoteByStrategy: ({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }) => {
    validateQuoteInput(checkout, wallet);
    return quoteCheckoutRoutes({ checkout, wallet, amountInput, strategy, networks, ...quoteOptions }).byStrategy?.[strategy] || [];
  },
  execute: ({ route, wallet, ...executionOptions }) => executeRoute(route, { wallet, ...executionOptions }),
};

export const SDK_VERSION = '0.1.0';
