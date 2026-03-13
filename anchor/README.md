# Verent Anchor Workspace

This folder contains the on-chain protocol scaffold for Verent's rental escrow program.

## What is here

- `Anchor.toml`: Anchor workspace configuration for localnet and devnet
- `programs/verent_rentals`: the Rust program scaffold
- `tests/verent_rentals.ts`: starter Anchor integration test outline

## Current scope

The scaffold covers:

- marketplace config
- listing registration and updates
- rental escrow creation
- escrow funding in USDC
- owner acceptance
- pickup / return confirmation
- happy-path completion
- cancellation
- dispute open / admin resolve

## Solana Playground

If you are using Solana Playground (`https://beta.solpg.io`), copy the contents of:

- `programs/verent_rentals/src/lib.rs`
- `programs/verent_rentals/src/constants.rs`
- `programs/verent_rentals/src/errors.rs`
- `programs/verent_rentals/src/events.rs`
- `programs/verent_rentals/src/state.rs`

into the Playground Anchor project structure.

## Notes

- The local machine currently does not have Rust / Anchor installed, so this workspace is scaffolded by hand.
- Treat this as the protocol source of truth to iterate on before full local compile/deploy automation is added.
