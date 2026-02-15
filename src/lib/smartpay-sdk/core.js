function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roundMoney(value) {
  return Number(Number(value || 0).toFixed(6));
}

export const TOKENS = {
  eth: {
    key: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    usd: 3200,
    chainId: 1,
    chain: 'ethereum',
    decimals: 18,
  },
  usdc: {
    key: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    usd: 1,
    chainId: 1,
    chain: 'ethereum',
    decimals: 6,
    contract: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  usdt: {
    key: 'usdt',
    symbol: 'USDT',
    name: 'Tether',
    usd: 1,
    chainId: 1,
    chain: 'ethereum',
    decimals: 6,
    contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
};

export const NETWORKS = {
  ethereum: {
    id: 1,
    label: 'Ethereum',
    gasBaseUsd: 5.8,
    latencyMinutes: 3.8,
    reliability: 0.985,
    icon: '🧊',
    explorer: 'https://etherscan.io/tx/',
    rpcChainId: 1,
  },
};

export const SUPPORTED_METHODS = ['ETH', 'USDC', 'USDT'];

export const defaultDemoWalletBalances = [
  {
    key: 'eth',
    symbol: TOKENS.eth.symbol,
    chain: TOKENS.eth.chain,
    decimals: TOKENS.eth.decimals,
    chainId: TOKENS.eth.chainId,
    amount: 4.7,
  },
  {
    key: 'usdc',
    symbol: TOKENS.usdc.symbol,
    chain: TOKENS.usdc.chain,
    decimals: TOKENS.usdc.decimals,
    chainId: TOKENS.usdc.chainId,
    amount: 12400,
  },
  {
    key: 'usdt',
    symbol: TOKENS.usdt.symbol,
    chain: TOKENS.usdt.chain,
    decimals: TOKENS.usdt.decimals,
    chainId: TOKENS.usdt.chainId,
    amount: 7800,
  },
];

export function createDemoWallet() {
  return {
    id: 'demo',
    connectorLabel: 'Demo Wallet',
    chain: NETWORKS.ethereum.label.toLowerCase(),
    chainId: NETWORKS.ethereum.rpcChainId,
    address: '0xDeMoWa11eT0000000000000000000000000001',
    balances: defaultDemoWalletBalances.map((balance) => ({ ...balance })),
    network: NETWORKS.ethereum,
    provider: null,
    isDemo: true,
  };
}

export function shortAddress(address = '') {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function money(amount) {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    style: 'currency',
    currency: 'USD',
  });
}

export function tokenAmount(amount, symbol) {
  return `${Number(amount).toFixed(Math.min(6, 4))} ${symbol}`;
}

export function routePriorityHint(route) {
  if ((route?.failureRate || 0.25) <= 0.11) {
    return 'Very high confidence';
  }
  if ((route?.failureRate || 0.25) <= 0.21) {
    return 'Good';
  }
  return 'Fallback route';
}

export function resolveTokenCatalog() {
  return {
    tokens: Object.values(TOKENS),
    mapBySymbol: Object.fromEntries(Object.values(TOKENS).map((token) => [token.symbol, token])),
    networks: NETWORKS,
  };
}

export function sanitizeAmount(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return roundMoney(parsed);
  }
  return roundMoney(fallback);
}

export function normalizeAddress(address) {
  return String(address || '').toLowerCase();
}

export function isLikelyEvmAddress(address = '') {
  return /^0x[a-fA-F0-9]{40}$/.test(address || '');
}

export function normalizeTokenList(values = []) {
  return [...new Set(values.map((item) => String(item || '').toUpperCase()))].filter(Boolean);
}

export function ensureWithinRange(value, min, max) {
  return clamp(sanitizeAmount(value), min, max);
}
