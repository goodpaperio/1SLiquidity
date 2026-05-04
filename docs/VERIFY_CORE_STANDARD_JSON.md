# Verify Core on Etherscan (Standard JSON Input + Flattening)

Use **Solidity (Standard-Json-Input)** so Etherscan compiles with the same inputs as your deployment. The process uses flattening (single-file or full compiler input) so verification succeeds.

---

## 1. Generate Standard-Json-Input (includes “flattening” via Forge)

From repo root, generate the JSON that matches your deployed Core:

```bash
./scripts/flatten-for-verification.sh
```

This writes **`flattened/Core-standard-json-input.json`** with the exact compiler input (sources + settings) Forge would use. No manual flatten step needed.

- **v1.0.6**: The script is set up for the Core address in `versions/deployment-addresses-mainnet-1.0.6.json`.  
- **Other version**: Edit `scripts/flatten-for-verification.sh` and set `CORE_ADDRESS` and `CORE_CONSTRUCTOR_ARGS` for your deployment, then run the script again.

**Compiler must match deployment**: The script uses **solc 0.8.30**, **optimizer 200 runs**, **via-ir**. If you deployed with different settings (e.g. `foundry.toml` has `optimizer_runs = 1000`), change `OPTIMIZER_RUNS` in the script and re-run so the generated JSON matches.

---

## 2. Get constructor arguments for your deployment

Core constructor: `(address _streamDaemon, address _executor, address _registry, address _ethSupport)`.

**v1.0.6** (Core `0x0367a0b3299ff8b6af83e52bae99d62270374ea2`):

- `_streamDaemon`: `0x28cfe436a24951b2080770bafb128c41be1b2cfa`
- `_executor`: `0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878`
- `_registry`: `0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4`
- `_ethSupport`: `0x0000000000000000000000000000000000000000` (set later via `setETHSupport`)

ABI-encoded (for Etherscan “Constructor Arguments” field, with or without `0x` depending on the form):

```bash
cast abi-encode 'constructor(address,address,address,address)' \
  0x28cfe436a24951b2080770bafb128c41be1b2cfa \
  0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878 \
  0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4 \
  0x0000000000000000000000000000000000000000
```

Use the hex string (with or without leading `0x` as Etherscan asks).

---

## 3. On Etherscan – verify Core

1. Open the contract page:  
   **https://etherscan.io/address/0x0367a0b3299ff8b6af83e52bae99d62270374ea2#code**  
   (replace with your Core address if different.)

2. Click **Contract** → **Verify and Publish**.

3. On the form:
   - **Compiler Type**: **Solidity (Standard-Json-Input)**.
   - **Compiler Version**: Pick the version that matches the JSON (e.g. **v0.8.30+commit.8c972834**). Uncheck “nightly” if needed.

4. **Standard Json Input**:  
   Click **Choose File** and select **`flattened/Core-standard-json-input.json`**  
   (or paste the file contents into the text area if the UI allows).

5. **Constructor Arguments (ABI-encoded)**:  
   Paste the hex from step 2 (with or without `0x` as the form indicates).

6. **Contract Name**: **Core** (if the form has a separate field).

7. Complete captcha, accept terms, click **Verify and Publish**.

---

## 4. If you prefer manual flatten + Standard JSON

If you want to use a single flattened Solidity file inside the Standard JSON:

1. **Flatten**:
   ```bash
   forge flatten src/Core.sol -o flattened/Core.sol
   ```

2. **Build Standard JSON** with that single source. Create a JSON file (e.g. `flattened/Core-standard-json-input-manual.json`) with:
   - `language`: `"Solidity"`
   - `sources`: one entry, key e.g. `"flattened/Core.sol"`, value `{"content": "<entire content of flattened/Core.sol>"}`
   - `settings`: same as your build (e.g. optimizer enabled, runs, `viaIR: true`, `evmVersion`, `outputSelection` for abi, bytecode, deployedBytecode).

   Compiler version and settings **must** match the build used at deployment (see `foundry.toml` and how you ran `forge build`).

3. On Etherscan: **Solidity (Standard-Json-Input)** → upload this JSON, set compiler version, paste constructor arguments, contract name **Core**.

---

## Summary (v1.0.6)

| Item | Value |
|------|--------|
| **Core address** | `0x0367a0b3299ff8b6af83e52bae99d62270374ea2` |
| **Standard-Json-Input file** | `flattened/Core-standard-json-input.json` (from script) |
| **Compiler** | v0.8.30 (match script/JSON) |
| **Optimization** | Yes, runs = 200 (or match your deployment) |
| **Via IR** | Yes |
| **Contract name** | Core |

If verification fails, double-check: compiler version, optimizer runs, via-ir, and constructor arguments (order: streamDaemon, executor, registry, ethSupport).
