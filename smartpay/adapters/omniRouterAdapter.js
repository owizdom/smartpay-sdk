import { NETWORKS } from '../core.js';

const BRIDGE_DELAY_VARIANCE = {
  ethereum: {
    sameChain: 0.4,
    bridge: 2.4,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomWithJitter(seed, min, max) {
  const hash = Array.from(String(seed || 'seed')).reduce((acc, item) => acc + item.charCodeAt(0), 0);
  const normalized = (hash % 10_000) / 10_000;
  return Number((min + (max - min) * normalized).toFixed(6));
}

function calculateReliability(chainRisk, bridgeRisk = 0, spread = 0) {
  const raw = chainRisk - bridgeRisk - spread;
  return clamp(raw, 0.9, 0.999);
}

function estimateBaseFee(token, sameChain, settlementPenalty) {
  const baseUsd = sameChain ? token.network.gasBaseUsd : token.network.gasBaseUsd + 3.8;
  const spread = sameChain ? 0.35 : 0.85;
  return baseUsd + spread + settlementPenalty;
}

function estimateNetworkFee(strategyKey, token, invoiceUsd, sameChain) {
  const strategyBias = {
    fastest: 1.12,
    balanced: 0.98,
    cheapest: 0.78,
  };
  const base = estimateBaseFee(token, sameChain, 0);
  const marketAdj = 1 + (invoiceUsd > 500 ? 0.007 : 0.012);
  const discount = strategyKey === 'cheapest' ? 0.06 : strategyKey === 'balanced' ? 0.01 : 0.0;
  const jitter = randomWithJitter(`${token.symbol}-${strategyKey}-${invoiceUsd}`, 0.7, 1.12);
  return Math.max(0.3, base * marketAdj * strategyBias[strategyKey] * (1 - discount) * jitter / 4);
}

function estimateEta(strategyKey, sameChain, chain) {
  const base = sameChain ? BRIDGE_DELAY_VARIANCE.ethereum.sameChain : BRIDGE_DELAY_VARIANCE.ethereum.bridge;
  const strategyBias = {
    fastest: 0.52,
    balanced: 0.82,
    cheapest: 1.18,
  };
  const jitter = randomWithJitter(`${strategyKey}-${chain}-${base}`, 0.85, 1.18);
  return Number((base * strategyBias[strategyKey] * jitter).toFixed(2));
}

export function buildOmniRouteCandidates({
  invoiceUsd,
  settlementToken,
  wallet,
  acceptedPaymentMethods,
  strategy,
  networks = NETWORKS,
}) {
  const selectedMethods = (acceptedPaymentMethods || []).map((item) => String(item).toUpperCase());
  const settlement = {
    ...settlementToken,
    symbol: settlementToken?.symbol || 'USDC',
    chain: settlementToken?.chain || 'ethereum',
  };

  const candidates = [];

  wallet.balances.forEach((asset) => {
    const token = wallet.tokenCatalog.find((item) => item.symbol === asset.symbol && item.chainId === asset.chainId);
    if (!token) {
      return;
    }

    if (selectedMethods.length > 0 && !selectedMethods.includes(token.symbol)) {
      return;
    }

    if (!asset.amount || asset.amount <= 0) {
      return;
    }

    const sameChain = asset.chain === settlement.chain;
    const sourceNetwork = networks?.[asset.chain] || networks?.[String(asset.chainId)] || NETWORKS.ethereum;
    const settlementNetwork = networks?.[settlement.chain] || networks?.[String(settlement.chainId)] || NETWORKS.ethereum;
    const feeUsd = estimateNetworkFee(
      strategy || 'balanced',
      { ...token, network: sourceNetwork },
      invoiceUsd,
      sameChain,
    );
    const bridgePenalty = sameChain ? 0 : randomWithJitter(`${asset.symbol}-${token.chain}`, 0.25, 0.95);
    const sourceUsdRate = token.usd;
    const requiredSource = (invoiceUsd / sourceUsdRate) * (1 + bridgePenalty * 0.008);
    const spread = (invoiceUsd / sourceUsdRate) * (1 + bridgePenalty * 0.006);

    const etaMinutes = estimateEta(strategy || 'balanced', sameChain, token.chain);
    const reliability = calculateReliability(sameChain ? 0.985 : 0.96, bridgePenalty * 0.02, invoiceUsd * 0.000001);
    const executable = token.symbol === 'ETH' || (settlement.symbol === token.symbol && sameChain);

    candidates.push({
      id: `route:${token.chain}:${token.symbol}:${Date.now().toString(36)}:${Math.floor(Math.random() * 10000)}`,
      sourceSymbol: token.symbol,
      sourceChain: token.chain,
      sourceKey: token.key,
      sourceChainId: token.chainId || sourceNetwork?.id || 1,
      settlementSymbol: settlement.symbol,
      settlementChain: settlement.chain,
      settlementChainId: settlement.chainId || settlementNetwork?.id || 1,
      sourceAmount: Number((requiredSource + spread * 0.0006).toFixed(6)),
      settlementAmountUsd: Number((invoiceUsd * 0.9975).toFixed(6)),
      settlementAmount: settlement.symbol === 'USDC' || settlement.symbol === 'USDT' ? invoiceUsd : invoiceUsd / (token.usd || 1),
      feesTotalUsd: Number((feeUsd + bridgePenalty).toFixed(6)),
      gasUsd: Number((sourceNetwork.gasBaseUsd || settlementNetwork.gasBaseUsd || 4).toFixed(6)),
      bridgeFeeUsd: Number((bridgePenalty + 0.3).toFixed(6)),
      spreadUsd: Number((spread || 0).toFixed(6)),
      etaMinutes,
      reliability,
      failureRate: Number((1 - reliability + 0.012 + bridgePenalty * 0.03).toFixed(4)),
      executable,
      explanation: sameChain
        ? `Direct on ${token.chain}`
        : `Bridge and settle to ${settlement.chain} using HOT Kit swap path`,
      routeMeta: {
        method: strategy || 'balanced',
        selectedByEngine: true,
      },
    });
  });

  return candidates;
}

export function rankCandidates(routes, strategy = 'balanced') {
  const weights = {
    fastest: { fee: 0.1, eta: 0.82, reliability: 0.08 },
    balanced: { fee: 0.4, eta: 0.35, reliability: 0.25 },
    cheapest: { fee: 0.82, eta: 0.1, reliability: 0.08 },
  };
  const w = weights[strategy] || weights.balanced;

  return [...routes]
    .map((route) => {
      const feeScore = Number(route.feesTotalUsd || 0) * (1 - w.fee);
      const etaScore = Number(route.etaMinutes || 0) * (1 - w.eta);
      const reliabilityScore = (1 - Number(route.reliability || 0.95)) * 100 * (1 - w.reliability);
      const score = feeScore + etaScore + reliabilityScore;
      return { ...route, score };
    })
    .sort((a, b) => a.score - b.score)
    .map((route, index) => ({
      ...route,
      rank: index + 1,
      isBest: index === 0,
      finalPayableUsd: Number((route.feesTotalUsd + Number(route.settlementAmountUsd || 0)).toFixed(6)),
    }));
}
