import { validateWithHotValidation } from './adapters/hotValidationAdapter.js';
import { executeRoute } from './executionEngine.js';
import { quoteCheckoutRoutes } from './routeEngine.js';

const DEFAULT_STRATEGY = 'balanced';

export class HotSmartPaySDK {
  constructor({ validationAdapter = validateWithHotValidation } = {}) {
    this.validationAdapter = validationAdapter;
  }

  async quote(
    checkout,
    wallet,
    {
      amountInput = null,
      strategy = DEFAULT_STRATEGY,
      networks,
      ...quoteOptions
    } = {},
  ) {
    return quoteCheckoutRoutes({
      checkout,
      wallet,
      amountInput,
      strategy,
      networks,
      ...(quoteOptions || {}),
    });
  }

  async quoteByStrategy(checkout, wallet, strategy = DEFAULT_STRATEGY, options = {}) {
    const result = await this.quote(checkout, wallet, { strategy, ...options });
    return result.byStrategy?.[strategy] || [];
  }

  async execute({ route, wallet, ...executionOptions }) {
    const validation = await this.validationAdapter({
      id: route?.id,
      amountUsd: route?.sourceAmount,
      settlementToken: route?.settlementSymbol,
      acceptedPaymentMethods: [route?.sourceSymbol],
      walletAddress: wallet?.address,
    });

    if (!validation?.ok) {
      return {
        ok: false,
        status: 'validation_failed',
        failureReason: validation?.message || 'Validation did not pass.',
      };
    }

    return executeRoute(route, { wallet, ...executionOptions });
  }
}

export const hotSmartPaySDK = new HotSmartPaySDK();
