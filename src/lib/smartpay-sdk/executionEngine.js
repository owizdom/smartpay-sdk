import { toHexString } from './internal/encoding.js';

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

function isLikelySimulation(route) {
  if (!route) {
    return true;
  }
  return !route.executable;
}

export async function executeRoute(route, options = {}) {
  const wallet = options.wallet || null;
  const delayMs = options.delayMs || 900;

  if (!route) {
    return { ok: false, failureReason: 'No route selected.' };
  }

  await sleep(650 + Math.random() * 350);

  if (isLikelySimulation(route) || !wallet?.provider) {
    await sleep(delayMs);
    const passed = Math.random() >= (route.failureRate || 0.08);
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
  }

  if (route.sourceSymbol !== 'ETH') {
    await sleep(delayMs * 0.8);
    return {
      ok: false,
      failureReason: 'Only ETH execution supported in simulation mode for this demo.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }

  try {
    const txHash = await wallet.provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: wallet.address,
          to: '0x3A1d0De8D8a73a9fF5f3c6f4A6f0f5D2E8d3C45F1',
          value: toHexString(route.sourceAmount),
        },
      ],
    });
    await sleep(550);
    return {
      ok: true,
      txHash,
      explorerHint: `${wallet.network?.explorer || 'https://etherscan.io/tx/'}${txHash}`,
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
      usedNetwork: `${route.sourceChain}→${route.settlementChain || route.sourceChain}`,
    };
  } catch (error) {
    return {
      ok: false,
      failureReason: error?.message || 'Wallet denied transaction.',
      routeId: route.id,
      sourceSymbol: route.sourceSymbol,
      settlementSymbol: route.settlementSymbol,
      strategy: route.strategy,
    };
  }
}
