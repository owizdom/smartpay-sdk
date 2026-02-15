# SmartPay SDK: My Journey

I started this project with a very practical goal: make crypto checkout feel as easy as a normal checkout flow.  
I wanted to build something that let people pay with crypto without reading a whitepaper, without hunting for settings, and without wondering if the payment route was even worth using.

At first, I went the usual way for a hackathon: I built a Next.js app, put in pages for welcome, register, dashboard, and customer checkout. I wired a wallet button, built route summaries, and added a few status badges so users could follow payment state end to end.  
It looked good. It worked enough for a demo. I had cards, toggles, and some visual flow. But after a few iterations, a hard truth showed up: the real value was never the UI.

The UI could change every week.  
The logic underneath had to be stable.

That realization changed the entire direction.

I shifted from “building screens” to building a **reusable payment engine**.  
If this logic was the real moat, it should not be trapped in one app. It should be a package. It should be embeddable. It should be reusable from any frontend or backend environment.

So I pivoted hard: from a checkout UI hackathon demo to a pure SDK project.

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
} from './src/lib/smartpay-sdk';

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

To verify syntax before publishing, run:

```bash
npm run lint
```

That currently validates the SDK source files directly with Node syntax checks:

```bash
node --check src/lib/smartpay-sdk/*.js src/lib/smartpay-sdk/adapters/*.js src/lib/smartpay-sdk/internal/*.js
```

---

## Notes and caveats

- This is a hackathon-stage SDK core, not yet a production gateway.
- Wallet providers and chain transports are intentionally abstracted so host apps can plug their own.
- The next stage is obvious: packaging, docs polish, stronger test coverage, and semantic versioning for a publishable npm artifact.

---

I started this project trying to ship a polished checkout screen.

I ended up with something more durable: a payment engine that any app can consume.

That shift took the project from “a demo UI” to “a technical foundation.”  
If the next step is to power real merchant flows, this architecture is already where that needs to be.
