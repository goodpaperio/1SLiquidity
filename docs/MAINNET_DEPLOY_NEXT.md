# Next mainnet deploy — checklist

## Is “everything fixed”?

| Layer | Status |
|--------|--------|
| **This repo** | Yes for the intended changes: `Registry` + `Core` quote-aux path, tests, address sync scripts, fork tooling. |
| **Live mainnet** | **Not until you broadcast deploys.** Today’s mainnet V3 fetchers still return **invalid `getQuote` ABI**; `Registry`/`Core` on chain may still be the **old** `prepareTradeData` (7 args) until you upgrade. |

After deploy, **`npm run test:mainnet-fetcher-alignment`** (with a real `MAINNET_RPC_URL`) should go **green**; until then it is expected to fail.

---

## Preconditions

1. **Branch / tag** with the code you want on mainnet (merged `Registry` + `Core` changes).
2. **`forge build --via-ir`** succeeds.
3. **`.env`** (or shell) has at least:
   - `MAINNET_RPC_URL`
   - Foundry keystore **`deployKey`** (matches `--account deployKey`)
   - `API_KEY_ETHERSCAN` (if verifying)
4. **Dry run on fork** (recommended):
   ```bash
   npm run test:all:anvil
   npm run test:forge:anvil:green
   ```

---

## Scripted path (Phases A → B → C)

Forge scripts write **`deployments/phase-a-mainnet.env`** and **`deployments/phase-b-mainnet.env`** (gitignored). `DeployBarebonesCore` reads env overrides (no manual Solidity edits).

| Phase | What | npm |
|-------|------|-----|
| **A** | Deploy 3× `UniswapV3Fetcher` (500 / 3000 / 10000) + `setQuoterV2` | `npm run deploy:phase-a:v3-fetchers` |
| **B** | Deploy new `Registry` + `setRouter` (same routers as `ConfigureRouters`) | `npm run deploy:phase-b:registry` |
| **C** | CREATE2 `StreamDaemon` + `Core` using Phase A/B env + **new salt tag** | see below |

**CREATE2 salt:** set a **new** tag vs any previous deploy, e.g. `export DEPLOY_BAREBONES_SALT_TAG=1.0.7` (used as `keccak256("StreamDaemon-<tag>)` / `keccak256("Core-<tag>)`).

### One-shot (recommended)

```bash
cd /path/to/1SLiquidity
source .env
export DEPLOY_BAREBONES_SALT_TAG=1.0.7   # bump every new Core/StreamDaemon pair
bash scripts/deploy-next-mainnet-phases.sh
```

Equivalent: **`npm run deploy:mainnet:next:phases`** (after exporting `DEPLOY_BAREBONES_SALT_TAG`).

### Step-by-step (same txs, more control)

```bash
cd /path/to/1SLiquidity
source .env
npm run deploy:phase-a:v3-fetchers
# deployments/phase-a-mainnet.env created

npm run deploy:phase-b:registry
# deployments/phase-b-mainnet.env created

export DEPLOY_BAREBONES_SALT_TAG=1.0.7
npm run deploy:phase-c:barebones:core
```

**Optional env overrides** for `DeployBarebonesCore` (if you do not use the generated files): `DEPLOY_BAREBONES_V3_500`, `DEPLOY_BAREBONES_V3_3000`, `DEPLOY_BAREBONES_V3_10000`, `DEPLOY_BAREBONES_REGISTRY`, `DEPLOY_BAREBONES_EXECUTOR`, `DEPLOY_BAREBONES_ETH_SUPPORT`, `DEPLOY_BAREBONES_V2`, `DEPLOY_BAREBONES_SUSHI`, `DEPLOY_BAREBONES_BALANCER`, `DEPLOY_BAREBONES_BOT` (optional `core.addBot` during deploy), `CREATE2_FACTORY_ADDRESS`.

**Sender:** override with `export DEPLOY_SENDER=0x...` when running **`bash scripts/deploy-next-mainnet-phases.sh`** (defaults to the same address as `package.json`).

---

## Re-configure routers on an existing Registry

`maintenance/ConfigureRouters.s.sol` uses **`REGISTRY_ADDRESS`** when set; otherwise the legacy default registry.

```bash
source .env
export REGISTRY_ADDRESS=0xYourNewRegistry
npm run maintenance:configure-routers
```

(Phase B already calls `setRouter` on the newly deployed registry; use this if you redeployed Registry manually or need to fix routers.)

---

## Phase D — Off-chain / repo hygiene

1. **Record addresses** in `versions/deployment-addresses-mainnet-<next>.json`.
2. **Sync Solidity constants:**
   ```bash
   npm run sync:mainnet-addresses:sol
   ```
3. **Verify** new contracts on Etherscan (`scripts/verify-etherscan-v2.sh`, `npm run verify:manual`, etc.).
4. **Bots / config** that pin Core or StreamDaemon: update to **new Core** and **new StreamDaemon** addresses.

---

## Phase E — Post-deploy validation

1. **Fork tests against mainnet RPC:**
   ```bash
   export MAINNET_RPC_URL=...   # HTTPS mainnet
   npm run test:mainnet-fetcher-alignment
   ```
2. **Small live trade** (optional): `npm run place-trade` / internal runbook with minimal size.
3. **Monitor** first `executeStream` / bot cycles for reverts.

---

## Rollback mindset

- Old **Core** + old **StreamDaemon** remain on chain; you switch traffic by **pointing operators/bots to the new Core**.
- If something is wrong, point back to previous Core and fix forward—**do not** assume partial upgrade (old Core + new Registry) works: **Core must call `prepareTradeData` with 8 arguments** on the new Registry.

---

## Related docs

- `docs/PRODUCTION_FIX_V3.md` — V3 quote vs execution, fetcher bytecode.
- `docs/TESTING_DEPLOYMENT_ALIGNMENT.md` — `MainnetAddresses.sol` sync.
- `docs/TESTING_FORGE_ANVIL.md` — local Anvil / forge matrices.
