import {
  createDemoWallet,
  quoteCheckoutRoutes,
  executeRoute,
  money,
  shortAddress,
} from '../smartpay/index.js';

const STRATEGIES = ['fastest', 'cheapest', 'balanced'];
const strategy = process.argv[2] || 'balanced';

const wallet = createDemoWallet();

const checkout = {
  id: 'demo-checkout-001',
  name: 'Starter Pack',
  priceMode: 'fixed',
  fixedAmount: 29.5,
  settlementAsset: 'USDC',
  acceptedPaymentMethods: ['ETH', 'USDC', 'USDT'],
};

async function main() {
  console.log('SmartPay SDK Demo');
  console.log('=================');
  console.log(`Wallet: ${shortAddress(wallet.address)}`);
  console.log(`Product: ${checkout.name} — ${money(checkout.fixedAmount)}`);
  console.log(`Strategy: ${strategy}\n`);

  const quote = quoteCheckoutRoutes({ checkout, wallet, strategy });

  console.log(`Invoice: ${money(quote.invoiceUsd)}`);
  console.log(`Selected route: ${quote.selected?.sourceSymbol} on ${quote.selected?.sourceChain}\n`);

  console.log('Routes by strategy:');
  STRATEGIES.forEach((s) => {
    const routes = quote.byStrategy?.[s] || [];
    const best = routes[0];
    if (!best) {
      console.log(`  [${s}] No routes`);
      return;
    }
    console.log(
      `  [${s}] ${best.sourceSymbol} on ${best.sourceChain} — fee ${money(best.displayFeeUsd)} — total ${money(best.displayTotalUsd)} — ETA ${best.displayEtaMinutes} min — confidence ${best.displayConfidence}%`
    );
  });

  console.log('\nExecuting payment (simulation)...');
  const result = await executeRoute(quote.selected, {
    wallet,
    forceExecution: false,
    simulationFailureRate: 0,
    delayMs: 100,
  });

  if (result.ok) {
    console.log(`Payment successful!`);
    console.log(`Tx hash: ${result.txHash}`);
  } else {
    console.log(`Payment failed: ${result.failureReason}`);
  }
}

main().catch((error) => {
  console.error('Demo failed:', error.message);
  process.exit(1);
});
