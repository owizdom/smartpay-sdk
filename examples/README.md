# Demo Script

## Run

```bash
npm run demo
```

What it demonstrates:

1. Quote generation by strategy (`fastest`, `cheapest`, `balanced`).
2. Pluggable transport execution (`smartPaySDK.execute` with `transports`).
3. Deterministic simulation fallback when no executable transport is provided.
4. Validation failure path in `hotSmartPaySDK.execute`.

## Foundry Demo (with execution)

From the repo root, start anvil first:

```bash
anvil --host 127.0.0.1 --port 8545 --chain-id 31337 > /tmp/anvil.log 2>&1 &
```

Then run one of these:

```bash
npm run demo:foundry:fastest
npm run demo:foundry:cheapest
npm run demo:foundry:balanced
```

Show all three strategy candidates in one run:

```bash
npm run demo:foundry:all
```
