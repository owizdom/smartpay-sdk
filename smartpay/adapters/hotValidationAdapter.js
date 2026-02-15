export class HotValidationAdapter {
  constructor({ endpoint = 'https://api.hot-labs.org' } = {}) {
    this.endpoint = endpoint;
  }

  async validateCheckoutPayload(payload) {
    const normalized = {
      checkoutId: String(payload?.id || payload?.checkoutId || '').trim(),
      amountUsd: Number(payload?.amountUsd || payload?.amount || 0),
      settlementToken: String(payload?.settlementToken || payload?.settlementSymbol || 'USDC').toUpperCase(),
      acceptedMethods: (payload?.acceptedPaymentMethods || []).map((item) => String(item || '').toUpperCase()),
      walletAddress: String(payload?.walletAddress || ''),
    };

    if (!normalized.checkoutId && !normalized.walletAddress) {
      return {
        ok: false,
        status: 'invalid_request',
        message: 'Missing checkout reference or wallet address.',
      };
    }

    if (!Number.isFinite(normalized.amountUsd) || normalized.amountUsd <= 0) {
      return {
        ok: false,
        status: 'invalid_amount',
        message: 'Amount must be a positive number.',
      };
    }

    if (!normalized.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(normalized.walletAddress)) {
      return {
        ok: false,
        status: 'invalid_wallet',
        message: 'Wallet address is not a valid EVM address.',
      };
    }

    return {
      ok: true,
      status: 'validated',
      message: 'Payload validated locally.',
      payload: normalized,
    };
  }

  async validateWalletCanPay(_walletAddress, _settlementToken) {
    return {
      ok: true,
      status: 'simulated_ok',
      message: 'Wallet validation passed in local mode.',
    };
  }
}

export async function validateWithHotValidation(payload, options = {}) {
  const adapter = new HotValidationAdapter(options);
  return adapter.validateCheckoutPayload(payload);
}
