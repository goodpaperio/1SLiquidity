# Specifications

# Specifications

This directory contains documentation for the project.

The docs are split into specifications and notes, the latter being made as a running log of the development process.

The specificaitons otherwise featured here should serve as a source of truth for the development of Smart Contracts, Middleware and to some degree the Front End (partial since such elements as design, user experience etc are not defined here) to the production deployment of Mk1.

Mk1 aims to be a functioning stream trading protocol facilitating optimised DEX routing and trade conditions for large and small volume traders.

The specifications are **technical**.

## Dev Rules

- Develop critical processes first and integrate later
- Follow the _premature abstraction is the root of all evil_ principle: a first draft can be close to a monolith. We can optimise when things are working
- Each time a contract is modified, its corresponding diagram and specification should be updated (@audit this should be built into a CI pipeline).

The specifications are stored in directories respective to the feature type of each component set, being:

_Front End_

- UI
- API

_Middleware_

- Keeper Client
- Subgraph

_Smart Contracts_

- Router
- Core
- Executor
- StreamDaemon
- Fees
- Utils

There may be notes aside the stricter specifications. These have been made through varying stages of the project's developmnet and shouldn't be referenced without a deep understanding of the architecture.
