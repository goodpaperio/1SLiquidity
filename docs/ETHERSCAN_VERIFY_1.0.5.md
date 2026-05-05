# Etherscan verification – v1.0.5 (Standard-Json-Input)

Verify **Core** and **StreamDaemon** on Etherscan using **Solidity (Standard-Json-Input)**. This method uses the exact compiler input (sources + settings) so bytecode matches and verification succeeds.

## 1. Generate Standard-Json-Input files

From repo root:

```bash
./scripts/flatten-for-verification.sh
```

This writes:

- **`flattened/Core-standard-json-input.json`** – compiler input for Core  
- **`flattened/StreamDaemon-standard-json-input.json`** – compiler input for StreamDaemon  

Settings are fixed to match deployment: **solc 0.8.30**, **optimizer 200 runs**, **via-ir**.

---

## 2. Verify Core (0x62a1e4dc903f0677ba4e06494af0a74d8a1205be)

1. Open: https://etherscan.io/address/0x62a1e4dc903f0677ba4e06494af0a74d8a1205be#code  
2. Click **Contract** → **Verify and Publish**.
3. On the verification form:

| Field | Value |
|-------|--------|
| **Contract Address** | `0x62a1e4dc903f0677ba4e06494af0a74d8a1205be` |
| **Compiler Type** | **Solidity (Standard-Json-Input)** |
| **Compiler Version** | **v0.8.30+commit.8c972834** (must match the JSON; uncheck “nightly” if needed) |

4. **Standard Json Input**:  
   Click “Choose File” and select **`flattened/Core-standard-json-input.json`** (or open the file, copy all contents, and paste into the text area if the UI allows).

5. **Constructor Arguments (ABI-encoded)** – paste exactly (without `0x` if the form says “without 0x”):

```
000000000000000000000000d35f101db2ea11693c09851389494d9e297de95c00000000000000000000000072a23d256fa59b7dbc812eade5aae062ba6c21c0000000000000000000000000478044a89d7fad50a2188070d85eaf3bd7dac7bb0000000000000000000000000000000000000000000000000000000000000000
```

6. **Contract Name**: enter **Core** (Etherscan may infer this from the JSON; if there’s a “Contract name” field, use `Core`).

7. Complete captcha, accept terms, and click **Verify and Publish**.

---

## 3. Verify StreamDaemon (0xd35f101db2ea11693c09851389494d9e297de95c)

1. Open: https://etherscan.io/address/0xd35f101db2ea11693c09851389494d9e297de95c#code  
2. Click **Contract** → **Verify and Publish**.
3. On the form:

| Field | Value |
|-------|--------|
| **Contract Address** | `0xd35f101db2ea11693c09851389494d9e297de95c` |
| **Compiler Type** | **Solidity (Standard-Json-Input)** |
| **Compiler Version** | **v0.8.30+commit.8c972834** |

4. **Standard Json Input**: select **`flattened/StreamDaemon-standard-json-input.json`**.

5. **Constructor Arguments (ABI-encoded)** – paste:

```
00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000600000000000000000000000097538a173e00ed37e96d8ded7c54051adb8fca7b0000000000000000000000007a88f533287ab702c7f13bbbf7112c6563c8aba800000000000000000000000d56510bbf2de389553571728807402b35920762f00000000000000000000000059590f24b3eb618fc090385e0f0ef4d22180942d000000000000000000000000fa6c98f6de087483aa74607b952ae11564962e87000000000000000000000000bfa5c66fb1131c599178c6b1fc863349e47b5d4e00000000000000000000000000000000000000000000000000000000000000060000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000d9e1ce17f2641f24ae83637ab66a2cca9c378b9f000000000000000000000000bfa5c66fb1131c599178c6b1fc863349e47b5d4e
```

6. **Contract Name**: **StreamDaemon** (if asked).
7. Complete captcha, accept terms, and click **Verify and Publish**.

---

## If verification fails

- **Compiler version**: Use exactly **v0.8.30** (e.g. **v0.8.30+commit.8c972834**). The script generates JSON with this version.
- **Constructor arguments**: If you deployed with different parameters, regenerate the JSON after updating the constructor args in `scripts/flatten-for-verification.sh`, then regenerate:
  ```bash
  # Example: Core with different args
  cast abi-encode 'constructor(address,address,address,address)' <streamDaemon> <executor> <registry> 0x0000000000000000000000000000000000000000
  ```
  Update the script and run `./scripts/flatten-for-verification.sh` again.
- **Contract name**: Etherscan sometimes requires the exact contract name (**Core** or **StreamDaemon**) in a dedicated field when using Standard-Json-Input.

---

## Summary

| Contract     | Address | Standard-Json-Input file |
|-------------|---------|---------------------------|
| Core        | `0x62a1e4dc903f0677ba4e06494af0a74d8a1205be` | `flattened/Core-standard-json-input.json` |
| StreamDaemon| `0xd35f101db2ea11693c09851389494d9e297de95c` | `flattened/StreamDaemon-standard-json-input.json` |

- **Compiler**: v0.8.30  
- **Optimization**: 200 runs  
- **Via IR**: Yes  
- **Method**: Solidity (Standard-Json-Input)
