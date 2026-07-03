# Arb Bot

Cross-venue arbitrage service: buy low on one venue (CEX, DEX, or DecaStream), sell high on another — gated on **≥ 10 bps net profit after all fees and gas**.

Unlike **liquidity-bot** (DEX-only, throughput-focused), arb-bot:

- Trades via **CEX APIs** (Binance, Coinbase, Kraken) as well as on-chain DEXes
- **Compares best execution** per leg: direct DEX vs DecaStream vs CEX — never assumes Deca
- Models **Deca +40 bps** on top of underlying DEX pool fees
- Uses **StreamDaemon** quotes for Deca path evaluation
- Learns from outcomes in **batches of 10 trades** to tighten profit predictions

## Documentation

| Document | Contents |
|----------|----------|
| [DESIGN.md](./DESIGN.md) | Strategy, architecture, venues, profit model, feedback loop |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phases, milestones, checklists |

## Status

**Planning only** — no code yet. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for build order.

## Related services

| Service | Role |
|---------|------|
| `liquidity-bot/` | DEX dislocation bot (reference patterns for scan, execution, PM2) |
| `local-monitor/` | Streams/settles open `placeTrade` positions when Deca path is chosen |
| `keeper/` | Off-chain sweetSpot mirror (`calculateSweetSpotV2`) |
