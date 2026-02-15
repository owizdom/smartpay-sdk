import { validateWithHotValidation } from './adapters/hotValidationAdapter.js';
import { executeRoute } from './executionEngine.js';
import { quoteCheckoutRoutes } from './routeEngine.js';

const DEFAULT_STRATEGY = 'balanced';

export class HotSmartPaySDK {
  constructor({ validationAdapter = validateWithHotValidation } = {}) {
    this.validationAdapter = validationAdapter;
  }

  async quote(checkout, wallet, { amountInput = null, strategy = DEFAULT_STRATEGY } = {}) {
    return quoteCheckoutRoutes({
      checkout,
      wallet,
      amountInput,
      strategy,
    });
  }

  async quoteByStrategy(checkout, wallet, strategy = DEFAULT_STRATEGY) {
    const result = await this.quote(checkout, wallet, { strategy });
    return result.byStrategy?.[strategy] || [];
  }

  async execute({ route, wallet }) {
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

    return executeRoute(route, { wallet });
  }
}

export const hotSmartPaySDK = new HotSmartPaySDK();
