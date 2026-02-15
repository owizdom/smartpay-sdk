import {
  createDemoWallet,
  quoteCheckoutRoutes,
  executeRoute,
} from '../smartpay/index.js';

const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
const FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const CHAIN_ID = Number(process.env.CHAIN_ID || 31337);
const STRATEGIES = ['fastest', 'cheapest', 'balanced'];

const requestedStrategy = process.argv[2] || process.env.DEMO_STRATEGY;
const runMode = process.argv.includes('--all') || process.env.DEMO_ALL === '1';
const strategy =
  requestedStrategy && STRATEGIES.includes(requestedStrategy)
    ? requestedStrategy
    : 'balanced';

function ensureAnvilResponse(result) {
  if (result?.error) {
    throw new Error(result.error.message || 'RPC error');
  }
  return result.result;
}

async function rpcRequest(method, params = []) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const payload = await response.json();
  return ensureAnvilResponse(payload);
}

const anvilProvider = {
  async request({ method, params }) {
    return rpcRequest(method, params);
  },
};

const wallet = createDemoWallet({
  address: FROM,
  chain: 'ethereum',
  chainId: CHAIN_ID,
  provider: anvilProvider,
});

const checkout = {
  id: 'foundry-demo',
  name: 'Demo Product',
  priceMode: 'fixed',
  fixedAmount: 12.5,
  settlementAsset: 'USDC',
  acceptedPaymentMethods: ['ETH', 'USDC'],
};

async function main() {
  console.log('Starting Foundry-backed SDK demo...');

  const chainId = await rpcRequest('eth_chainId');
  console.log('Connected chainId:', Number(chainId));

  const quote = quoteCheckoutRoutes({
    checkout,
    wallet,
    strategy,
  networks: {
      ethereum: {
        label: 'Ethereum',
        gasBaseUsd: 4.8,
        explorer: 'https://etherscan.io/tx/',
        rpcChainId: CHAIN_ID,
      },
    },
  });

  if (runMode) {
    STRATEGIES.forEach((name) => {
      const route = quote.byStrategy?.[name]?.[0];
      if (!route) {
        console.log(`No route found for ${name}`);
        return;
      }
      console.log(
        `[${name}]`,
        route.sourceSymbol,
        route.sourceChain,
        'total',
        route.displayTotalUsd,
      );
    });
    return;
  }

  const route = quote.byStrategy?.[strategy]?.[0] || quote.selected;
  if (!route) {
    throw new Error(`No route found for strategy: ${strategy}`);
  }

  console.log('Chosen strategy:', strategy);
  console.log('Best route:', route.sourceSymbol, route.sourceChain, 'total', route.displayTotalUsd);

  const result = await executeRoute(route, {
    wallet,
    transportResolver: () => anvilProvider,
    toAddress: '0x0000000000000000000000000000000000000000',
    forceExecution: true,
  });

  console.log('Execution result:', result);
}

main().catch((error) => {
  console.error('Foundry demo failed:', error.message);
  process.exit(1);
});
