import { toHexString } from './internal/encoding.js';

const DEFAULT_RECIPIENT = '0x3A1d0De8D8a73a9fF5f3c6f4A6f0f5D2E8d3C45F1';
const DEFAULT_CHAIN_EXPLORERS = {
  ethereum: 'https://etherscan.io/tx/',
  1: 'https://etherscan.io/tx/',
};
const DEFAULT_RANDOM_FAILURE_RATE = 0.08;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomTxHash() {
  const chars = 'abcdef0123456789';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function isFunction(value) {
  return typeof value === 'function';
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function isLikelySimulation(route) {
  if (!route) {
    return true;
  }
  return !route.executable;
}

function normalizeChainKey(route) {
  const chain = String(route?.sourceChain || '').toLowerCase();
  if (chain) {
    return chain;
  }
  const chainId = route?.sourceChainId ?? route?.sourceChain;
  if (chainId === undefined || chainId === null) {
    return '';
  }
  return String(chainId);
}

function normalizeAddress(value) {
  return String(value || '').toLowerCase();
}

function buildExplorer({ route, transport, wallet }) {
  if (transport?.explorer) {
    return transport.explorer;
  }

  if (transport?.chainId && DEFAULT_CHAIN_EXPLORERS[transport.chainId]) {
    return DEFAULT_CHAIN_EXPLORERS[transport.chainId];
  }

  if (wallet?.network?.explorer) {
    return wallet.network.explorer;
  }

  if (route?.sourceChain && DEFAULT_CHAIN_EXPLORERS[route.sourceChain]) {
    return DEFAULT_CHAIN_EXPLORERS[route.sourceChain];
  }

  if (route?.sourceChainId && DEFAULT_CHAIN_EXPLORERS[route.sourceChainId]) {
    return DEFAULT_CHAIN_EXPLORERS[route.sourceChainId];
  }

  return DEFAULT_CHAIN_EXPLORERS.ethereum;
}

function getTransport(route, options = {}) {
  const {
    wallet,
    provider,
    transports = {},
    transportResolver,
  } = options;

  if (isFunction(transportResolver)) {
    const resolved = transportResolver({ route, wallet });
    if (resolved) {
      return resolved;
    }
  }

  const chainKey = normalizeChainKey(route);
  if (chainKey && transports[chainKey]) {
    return transports[chainKey];
  }

  if (wallet?.transports && isObject(wallet.transports)) {
    const chainTransport = wallet.transports[chainKey];
    if (chainTransport) {
      return chainTransport;
    }
    if (chainKey && wallet.transports[route?.sourceChainId]) {
      return wallet.transports[route.sourceChainId];
    }
  }

  return provider || wallet?.provider || null;
}

function extractTxHash(response) {
  if (!response) {
    return null;
  }

  if (typeof response === 'string') {
    return response;
  }

  if (typeof response.hash === 'string') {
    return response.hash;
  }

  if (typeof response.transactionHash === 'string') {
    return response.transactionHash;
  }

  return null;
}

async function executeWithTransport(route, { wallet, transport, to, delayMs }) {
  const normalizedTo = normalizeAddress(to || route?.to || DEFAULT_RECIPIENT);
  if (!normalizedTo || !normalizedTo.startsWith('0x')) {
    return {
      ok: false,
      status: 'invalid_recipient',
      failureReason: 'Execution recipient address is required.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }

  if (isFunction(transport?.executeRoute)) {
    const response = await transport.executeRoute({ route, wallet, to: normalizedTo });
    if (response && typeof response === 'object' && 'ok' in response) {
      return response;
    }
    const hash = extractTxHash(response);
    if (hash) {
      return {
        ok: true,
        txHash: hash,
        routeId: route.id,
        sourceSymbol: route.sourceSymbol,
        settlementSymbol: route.settlementSymbol,
        strategy: route.strategy,
      };
    }
    return {
      ok: false,
      failureReason: 'Custom transport returned invalid execution payload.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }

  if (isFunction(transport?.execute)) {
    const response = await transport.execute({ route, wallet, to: normalizedTo });
    const hash = extractTxHash(response);
    if (hash) {
      return {
        ok: true,
        txHash: hash,
        routeId: route.id,
        sourceSymbol: route.sourceSymbol,
        settlementSymbol: route.settlementSymbol,
        strategy: route.strategy,
      };
    }
    return {
      ok: false,
      failureReason: 'Custom transport execute() did not return a transaction hash.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }

  if (isFunction(transport?.sendTransaction)) {
    const response = await transport.sendTransaction({
      from: wallet?.address,
      to: normalizedTo,
      value: toHexString(route.sourceAmount),
    });
    const hash = extractTxHash(response);
    if (hash) {
      await sleep(delayMs * 0.6);
      return {
        ok: true,
        txHash: hash,
        routeId: route.id,
        sourceSymbol: route.sourceSymbol,
        settlementSymbol: route.settlementSymbol,
        strategy: route.strategy,
      };
    }
  }

  if (isFunction(transport?.request)) {
    const txHash = await transport.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: wallet?.address,
          to: normalizedTo,
          value: toHexString(route.sourceAmount),
        },
      ],
    });

    const hash = extractTxHash(txHash);
    if (hash) {
      return {
        ok: true,
        txHash: hash,
        routeId: route.id,
        sourceSymbol: route.sourceSymbol,
        settlementSymbol: route.settlementSymbol,
        strategy: route.strategy,
      };
    }
  }

  return {
    ok: false,
    failureReason: 'Transport does not expose a compatible execution method.',
    routeId: route.id,
    sourceSymbol: route.sourceSymbol,
    settlementSymbol: route.settlementSymbol,
    strategy: route.strategy,
  };
}

function simulateExecution(route, { delayMs, failureRate = DEFAULT_RANDOM_FAILURE_RATE }) {
  return sleep(delayMs).then(() => {
    const passed = Math.random() >= failureRate;
    return {
      ok: passed,
      txHash: passed ? randomTxHash() : null,
      explorerHint: passed ? randomTxHash() : null,
      failureReason: passed ? null : 'Route simulation failed to finalize.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
      usedNetwork: `${route.sourceChain}→${route.settlementChain || route.sourceChain}`,
    };
  });
}

export async function executeRoute(route, options = {}) {
  const wallet = options.wallet || null;
  const delayMs = options.delayMs || 900;
  const simulationFailureRate = options.simulationFailureRate ?? DEFAULT_RANDOM_FAILURE_RATE;
  const forceExecution = options.forceExecution === true;

  if (!route) {
    return { ok: false, failureReason: 'No route selected.' };
  }

  const transport = getTransport(route, options);
  const shouldSimulate = isLikelySimulation(route) || (!forceExecution && !transport);
  const explorerHint = buildExplorer({ route, transport, wallet });

  await sleep(650 + Math.random() * 350);

  if (shouldSimulate) {
    const result = await simulateExecution(route, { delayMs, failureRate: simulationFailureRate });
    return {
      ...result,
      explorerHint: result.ok ? result.explorerHint : null,
    };
  }

  try {
    const result = await executeWithTransport(route, {
      wallet,
      transport,
      to: options.toAddress || options.to,
      delayMs,
    });

    if (!result) {
      return {
        ok: false,
        failureReason: 'Execution returned no result.',
        routeId: route.id,
        sourceSymbol: route.sourceSymbol,
        settlementSymbol: route.settlementSymbol,
        strategy: route.strategy,
      };
    }

    if (!result.ok) {
      return result;
    }

    return {
      ...result,
      explorerHint: result.txHash ? `${explorerHint}${result.txHash}` : null,
      usedNetwork: `${route.sourceChain}→${route.settlementChain || route.sourceChain}`,
    };
  } catch (error) {
    return {
      ok: false,
      failureReason: error?.message || 'Wallet provider denied transaction.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }
}
