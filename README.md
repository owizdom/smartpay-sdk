# SmartPay SDK: My Journey

I started this project with a very practical goal: make crypto checkout feel as seamless as any normal checkout flow. I wanted to create something that let people pay with crypto without reading a whitepaper, hunting through settings, or wondering whether the payment route was even worth it.

At first, I took the usual hackathon approach: I built a [Next.js app](https://github.com/owizdom/near-checkout-hackathon-SCRAPPED) with pages for welcome, registration, dashboard, and customer checkout. I wired in a wallet button, built route summaries, and added status badges so users could follow the payment process end to end. I even designed cards, toggles, and a visual flow to make the experience feel polished. For a demo, it looked good and worked well enough.

But after a few iterations, a hard truth became clear: the real value wasn’t in the UI.

The interface could change every week. The logic underneath had to be stable, reliable, and reusable.

That realization completely changed the direction of the project.

I shifted my focus from “building screens” to building a reusable payment engine. If the core logic was the real moat, it shouldn’t be locked into a single app. It should be a package. It should be embeddable. It should work from any frontend or backend environment.

So I pivoted hard: what started as a hackathon UI demo became a pure SDK-first project—clean, modular, and designed to power crypto payments anywhere.

---

## Why this pivot was necessary

The checkout UX I had built was helpful for demonstration, but it was constrained:

- it assumed one UI stack,
- it tied together wallet state, route evaluation, and execution in a way that was hard to reuse,
- and it made the core engine feel like “part of the app” instead of “something developers could bring into their app.”

When I extracted the engine into SDK modules, every other part became a consumer concern:

- the host app can decide how to render,
- the host app can decide what wallet library to use,
- and the host app can decide which chains to support.

That is the difference between a demo and a product.

---

## How I rebuilt it

I rebuilt the repo around a few core layers:

### 1) Core primitives (`core.js`)

I started by creating clean primitives for payment inputs and identity helpers:

- token and chain definitions,
- wallet object helpers (including demo wallet creation),
- lightweight formatting utilities,
- and address/amount/route guards used everywhere else.

This is the foundation layer that makes every module deterministic and testable.

### 2) Route generation and ranking (`routeEngine.js`, `omniRouterAdapter.js`)

This is where the engine “thinks”:

- build candidate payment routes from a checkout request,
- score each route by strategy (`fastest`, `cheapest`, `balanced`),
- rank candidates by deterministic logic and return best options.

I intentionally kept route generation separate from wallet execution and separated “which route exists” from “how it executes.” That kept the architecture simple and modular.

### 3) Validation adapter (`hotValidationAdapter.js`)

I added validation early and always:

- validate checkout payload shape,
- validate wallet/address inputs,
- validate selected route state before execution.

The goal is simple: failures should be obvious and cheap to catch before signing anything.

### 4) Execution layer (`executionEngine.js`)

Execution needed two modes:

- real execution when a wallet is available,
- deterministic simulation for test/demo usage.

That gave me a stable testing path that never required on-chain spend just to validate behavior.

### 5) Facade API (`hotSmartPaySDK.js`, `index.js`)

I then built the developer entrypoint so consumers can use one clean surface:

- quote by strategy,
- auto-select best route,
- execute chosen route.

I exposed both a `smartPaySDK` singleton-style object and a `HotSmartPaySDK` class to support both app-level and app-agnostic consumption.

### 6) Internal helpers (`internal/encoding.js`)

Internals stay internal:

- hex conversions,
- utility normalizations,
- repeated low-level helpers.

No business logic lives there. It supports the engine without exposing complexity.

---

## What this SDK does now

In practice, the SDK supports the following flow:

1. A host app builds a checkout request (product, amount, settlement asset, accepted methods).
2. A wallet is prepared (real wallet or demo wallet).
3. The engine returns route candidates and ranked options per strategy.
4. The host app renders those options in any way it wants.
5. Once a user selects a route, the app calls execute.
6. Execution resolves with success metadata, including a transaction reference, or returns a clear failure object.

If wallet wiring is missing, simulation mode still produces realistic deterministic output so QA and frontend flows can be validated quickly.

---

## The API I ended up with

### Direct exports

- `smartPaySDK`
- `hotSmartPaySDK`
- `HotSmartPaySDK`
- `createDemoWallet`
- `quoteCheckoutRoutes`
- `rankRoutes`
- `buildOmniRouteCandidates`
- `rankCandidates`
- `executeRoute`
- `validateWithHotValidation`

### Core constants/helpers

- `TOKENS`
- `NETWORKS`
- `SUPPORTED_METHODS`
- `shortAddress`
- `money`

---

## Usage example

```js
import {
  smartPaySDK,
  hotSmartPaySDK,
  createDemoWallet,
} from './smartpay';

const checkout = {
  id: 'invoice-001',
  name: 'Starter Pack',
  priceMode: 'fixed',
  fixedAmount: 29.5,
  settlementAsset: 'USDC',
  acceptedPaymentMethods: ['ETH', 'USDC', 'USDT'],
};

const wallet = createDemoWallet();

const quote = await hotSmartPaySDK.quote(checkout, wallet, {
  strategy: 'balanced',
});

console.log('Selected route:', quote.selected?.sourceSymbol);
console.log('Available strategies:', Object.keys(quote.byStrategy));
console.log('Best total USD:', quote.selected?.displayTotalUsd);

const route = quote.selected || quote.byStrategy?.balanced?.[0];
const result = await smartPaySDK.execute({ route, wallet });

console.log('Executed?', result.ok, 'TX hash:', result.txHash);
```

---

## What I removed (on purpose)

To keep the SDK clean, I removed the entire UI stack that came from the hackathon build:

- Next.js app directory and route pages,
- all layout and component files,
- dashboard/store hooks and UI adapters tied only to that one frontend,
- Next toolchain config and UI runtime files.

I kept the project intentionally minimal: no app router, no checkout screens, no marketing page, no custom wallet button UX.  
Only reusable, composable SDK code remains.

---

## Sanity checks

Use linting and tests before publishing:

```bash
npm run lint
npm test
```

```bash
node --check smartpay/*.js smartpay/adapters/*.js smartpay/internal/*.js
```

## Packaging for npm

This package is now configured as a publishable module:

- `package.json` exports `smartpay/index.js` as the public entry.
- `files` includes `smartpay/` and `README.md` only, keeping published artifacts lean.
- `prepublishOnly` runs lint + tests.

To publish:

1. Bump `version` in `package.json`.
2. Run `npm install` (for dependencies, if any).
3. Run `npm test`.
4. Run `npm publish --access public`.

```bash
npm version patch
npm run lint
npm test
npm publish --access public
```

## Developer docs polish checklist

- Abstract wallet + transport layer: documented in this README and enforced in runtime.
- API entry points and options are centralized in `smartpay/index.js`.
- Route and execution behavior is covered by tests under `test/`.
- Deterministic test-friendly execution is available via:
  - `forceExecution: true/false`
  - `simulationFailureRate`
  - deterministic mocks via transport adapters

### Test suite

Coverage currently includes:

- Quote generation across strategies.
- Transport precedence in execution.
- Simulation execution fallback behavior.
- Validation gate inside `hotSmartPaySDK.execute`.

Run:

```bash
npm test
```

---

## API Reference

### `smartPaySDK`

#### `smartPaySDK.quoteCheckout({ checkout, wallet, amountInput, strategy, networks })`

- Returns:
  - `invoiceUsd`
  - `selected` (best route across all strategies)
  - `byStrategy` (`fastest`, `cheapest`, `balanced`)
- Use when you want one call to return all candidate routes.

#### `smartPaySDK.quoteByStrategy({ checkout, wallet, amountInput, strategy, networks })`

- Returns only routes for the requested strategy.

#### `smartPaySDK.execute({ route, wallet, ...executionOptions })`

- Executes one route.
- Resolves transport using the abstraction chain documented below.
- Returns `{ ok, txHash?, explorerHint?, status?, failureReason? }`.

### `hotSmartPaySDK` class

```js
import { hotSmartPaySDK } from './smartpay';

await hotSmartPaySDK.quote(checkout, wallet, options);
await hotSmartPaySDK.quoteByStrategy(checkout, wallet, strategy, options);
await hotSmartPaySDK.execute({ route, wallet, ...executionOptions });
```

`hotSmartPaySDK` also runs the validation adapter before execution.

### Direct exports

Low-level exports are available for advanced integrations:

- `executeRoute`
- `quoteCheckoutRoutes`
- `rankRoutes`
- `buildOmniRouteCandidates`
- `rankCandidates`
- `validateWithHotValidation`
- `HotValidationAdapter`
- `HotSmartPaySDK`

### Checkout payload fields

Required:

- `id`
- `name`
- `priceMode` (`fixed` or `variable`)
- `fixedAmount` (for `fixed`) or `variableMin`/`variableMax` (for `variable`)
- `settlementAsset`
- `acceptedPaymentMethods`

Example:

```js
const checkout = {
  id: 'invoice-001',
  name: 'Starter Pack',
  priceMode: 'fixed',
  fixedAmount: 29.5,
  settlementAsset: 'USDC',
  acceptedPaymentMethods: ['ETH', 'USDC', 'USDT'],
};
```

### Error model

- `ok: false` returns include `failureReason` and often `status` for deterministic branching.
- Simulation failures produce realistic but deterministic errors when forced for testing.

## Installation

```bash
npm install smartpay-sdk
```

Import:

```js
import { smartPaySDK } from 'smartpay-sdk';
```

For local workspace work:

```bash
git clone https://github.com/owizdom/smartpay-sdk.git
cd smartpay-sdk
npm install
```

## Notes and caveats

- This is a hackathon-stage SDK core, not yet a production gateway.
- Routes can be quoted with custom network metadata and executed with host-provided chain transports.
- The next stage is obvious: packaging, docs polish, stronger test coverage, and semantic versioning for a publishable npm artifact.

## Wallet + transport abstraction (core feature)

The SDK intentionally does not own your wallet or transport layer.

Host apps can inject:

- a wallet provider (single fallback),
- per-chain transports (`transports` map),
- a transport resolver callback (`transportResolver`) for dynamic route-aware selection.

This keeps the SDK usable with web wallets, mobile providers, custom relayers, and test mocks.

### Wallet shape

```js
{
  address: '0x...',
  chain: 'ethereum', // optional
  chainId: 1,       // optional
  provider: walletProvider, // optional global fallback
  transports: {      // optional per-chain map
    ethereum: transport,
    1: transport,
  },
}
```

### Execution contract

`smartPaySDK.execute(...)` resolves transport in this order:

1. `transportResolver({ route, wallet })`
2. `transports[route.sourceChain]` or `transports[route.sourceChainId]`
3. `wallet.transports[route.sourceChain]` or `wallet.transports[route.sourceChainId]`
4. `provider`
5. `wallet.provider`

Transport must expose one of:

- `executeRoute({ route, wallet, to })`
- `execute({ route, wallet, to })`
- `sendTransaction({ from, to, value })`
- `request({ method, params })`

Return either:

- tx hash string, or
- object with `hash` / `transactionHash`.

If no transport is found and `forceExecution` is not set, the engine uses deterministic simulation.

### API options

```js
smartPaySDK.execute({
  route,
  wallet,
  provider,
  transports,
  transportResolver,
  toAddress,
  forceExecution,
  delayMs,
  simulationFailureRate,
});
```

### Example 1: custom provider and map injection

```js
import { createDemoWallet, smartPaySDK } from './smartpay';

const wallet = createDemoWallet({
  provider: browserWalletProvider, // optional global fallback
  transports: {
    ethereum: {
      request: async ({ method, params }) => browserWalletProvider.request({ method, params }),
      explorer: 'https://etherscan.io/tx/',
    },
  },
});

const quote = await smartPaySDK.quoteCheckout({
  checkout,
  wallet,
  strategy: 'balanced',
  networks: {
    ethereum: { label: 'Ethereum', gasBaseUsd: 4.8, explorer: 'https://etherscan.io/tx/', rpcChainId: 1 },
  },
});

const result = await smartPaySDK.execute({
  route: quote.selected,
  wallet,
  toAddress: '0xMerchantAddress...',
  forceExecution: false,
});
```

### Example 2: dynamic resolver

```js
const transportResolver = ({ route }) => {
  if (route.sourceChainId === 1) {
    return ethereumTransport; // must follow one of the transport contracts
  }
  if (route.sourceChainId === 8453) {
    return baseTransport;
  }
  return null;
};

await smartPaySDK.execute({
  route,
  wallet,
  transportResolver,
  provider,
});
```

### Example 3: deterministic test/staging execution

```js
await smartPaySDK.execute({
  route,
  wallet,
  forceExecution: true,
  delayMs: 800,
  simulationFailureRate: 0.02,
});
```

### Example 4: custom network metadata + custom transport map

```js
const networks = {
  base: { label: 'Base', gasBaseUsd: 1.2, latencyMinutes: 1.1, explorer: 'https://basescan.org/tx/', rpcChainId: 8453 },
  polygon: { label: 'Polygon', gasBaseUsd: 0.9, latencyMinutes: 1.4, explorer: 'https://polygonscan.com/tx/', rpcChainId: 137 },
};

const quote = await smartPaySDK.quoteCheckout({
  checkout,
  wallet,
  strategy: 'fastest',
  networks,
});

const tx = await smartPaySDK.execute({
  route: quote.selected,
  wallet,
  transports: {
    base: { request: baseProvider.request },
    8453: { request: baseProvider.request },
    polygon: { request: polygonProvider.request },
  },
});
```

---

I started this project trying to ship a polished checkout screen.

I ended up with something more durable: a payment engine that any app can consume.

That shift took the project from “a demo UI” to “a technical foundation.”  
If the next step is to power real merchant flows, this architecture is already where that needs to be.
