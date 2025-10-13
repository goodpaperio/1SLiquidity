# 🚀 Système de Tests Dynamique

## ✨ Concept

Le système de tests s'adapte **automatiquement** au nombre de tokens dans `liquidity.json`.

**Aucune modification du code de test n'est nécessaire lors de la mise à jour des données !**

## 📊 Architecture

```
liquidity.json (nouvelle donnée)
    ↓
config/generate-pairs.js (régénération)
    ↓
*_pairs_clean.json (nouveaux tokens)
    ↓
Config.sol (chargement dynamique)
    ↓
CoreFork.t.sol (4 tests, chunking automatique)
    ↓
JSON results (agrégation automatique)
```

## 🔄 Workflow Complet

### 1. Mise à jour des données

```bash
# Nouvelle version de liquidity.json reçue
cp nouvelle-liquidity.json config/liquidity.json
```

### 2. Régénération des fichiers

```bash
cd config
npm run generate:pairs
```

Résultat:
- `usdc_pairs_clean.json` - X pairs (adaptatif)
- `usdt_pairs_clean.json` - Y pairs (adaptatif)
- `weth_pairs_clean.json` - Z pairs (adaptatif)
- `wbtc_pairs_clean.json` - W pairs (adaptatif)

### 3. Tests automatiques

```bash
cd ..
./test-all
```

✅ **Les tests s'adaptent automatiquement !**
- Si USDC passe de 71 → 150 pairs → Tests 150 pairs (15 chunks)
- Si WETH passe de 99 → 50 pairs → Tests 50 pairs (5 chunks)

## 📈 Exemples

### Scenario 1: Ajout de nouveaux tokens

```
Avant: USDC = 71 pairs
Après: USDC = 120 pairs

→ Le test divise automatiquement en 12 chunks de 10
→ Aucune modification du code nécessaire
```

### Scenario 2: Suppression de tokens

```
Avant: WETH = 99 pairs
Après: WETH = 30 pairs

→ Le test divise automatiquement en 3 chunks de 10
→ Aucune modification du code nécessaire
```

### Scenario 3: Nouveau token de base

Pour ajouter un nouveau token de base (ex: DAI):

1. **Ajouter dans `config/generate-pairs.js`**:
```javascript
const BASE_TOKENS = {
  usdc: '0x...',
  usdt: '0x...',
  wbtc: '0x...',
  weth: '0x...',
  dai: '0x...'  // Nouveau
};
```

2. **Ajouter dans `Config.sol`** (une fois):
```solidity
function loadDAIPairAddresses() public { ... }
```

3. **Ajouter un test dans `CoreFork.t.sol`** (une fois):
```solidity
function test_PlaceTradeWithDAITokens() public {
    address dai = getTokenByName("dai");
    _testTradesForToken("DAI", daiPairAddresses, dai, DAI_WHALE, formatTokenAmount(dai, 1000));
}
```

C'est tout ! Le chunking est automatique.

## 💰 Performance

| Tokens per base | Chunks | Gas per test | Status |
|-----------------|--------|--------------|--------|
| 10 pairs | 1 chunk | ~2M | ✅ Fast |
| 50 pairs | 5 chunks | ~10M | ✅ Good |
| 100 pairs | 10 chunks | ~20M | ✅ OK |
| 200 pairs | 20 chunks | ~40M | ✅ OK |
| 450 pairs | 45 chunks | ~90M | ⚠️ Limit |

Gas limit: **90M** (configurable in `foundry.toml`)

## 🎯 Code Structure

### Simple & Clean

Only **4 test functions** in `CoreFork.t.sol`:

```solidity
function test_PlaceTradeWithUSDCTokens() public {
    _testTradesForToken("USDC", usdcPairAddresses, usdc, USDC_WHALE, amount);
}

function test_PlaceTradeWithUSDTTokens() public {
    _testTradesForToken("USDT", usdtPairAddresses, usdt, USDT_WHALE, amount);
}

function test_PlaceTradeWithWETHTokens() public {
    _testTradesForToken("WETH", wethPairAddresses, weth, WETH_WHALE, amount);
}

function test_PlaceTradeWithWBTCTokens() public {
    _testTradesForToken("WBTC", wbtcPairAddresses, wbtc, WBTC_WHALE, amount);
}
```

### Smart Internal Logic

```solidity
function _testTradesForToken(...) {
    // Calculate chunks dynamically
    numChunks = (totalPairs + 10 - 1) / 10;
    
    // Loop through chunks
    for (chunk = 0; chunk < numChunks; chunk++) {
        // Test 10 tokens
        // Aggregate results
    }
    
    // Output total summary
}
```

## 📚 Documentation

- **Quick Start**: See `TEST_SCRIPTS_README.md`
- **Config Generation**: See `config/SCRIPT_README.md`
- **Full Guide**: This file

## ✅ Advantages vs Static Chunks

| Aspect | Static (25 tests) | Dynamic (4 tests) |
|--------|-------------------|-------------------|
| **Maintenance** | Edit code for each change | Zero maintenance |
| **Lines of code** | 530 lines | **449 lines** |
| **Test functions** | 25 hardcoded | **4 dynamic** |
| **Adaptability** | Manual updates needed | **Auto-adapts** |
| **Scalability** | Limited to hardcoded ranges | **Unlimited** |

## 🐛 Troubleshooting

### OutOfGas Error

```bash
# Reduce chunk size
# Edit test/fork/CoreFork.t.sol line ~208
uint8 chunkSize = 5;  # Reduce from 10
```

### Tests Take Too Long

```bash
# Run individual token tests
./test-usdc  # Fastest (usually 71 pairs)

# Or run in parallel
./test-usdc & ./test-usdt & ./test-weth & ./test-wbtc & wait
```

---

**Status**: ✅ Production Ready - Fully Dynamic  
**Last Updated**: 2025-10-05
