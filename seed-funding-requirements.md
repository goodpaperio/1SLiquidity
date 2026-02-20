## Pre-Seed Product Requirements

- Set the minimum sweet spot to 1.
- Finish Balancer pool support end-to-end.
- Implement `getQuote()` for every DEX; use the returned expected amount-out to drive execution and allow up to 10 bps slippage under the quote to ensure completion.
- Permit user-supplied token addresses (outside vetted lists); the keeper must honor these addresses for reserve fetches and the UI must reflect them, with a warning dialog shown to users.
- Expose a user-configurable limit for binary search iterations (currently hardcoded to 5).
