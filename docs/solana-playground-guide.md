# Solana Playground Guide

Use this flow when you want to compile and deploy the Verent protocol without a local Rust / Anchor toolchain.

## Workspace source

Copy the program scaffold from:

- `anchor/programs/verent_rentals/src/lib.rs`
- `anchor/programs/verent_rentals/src/constants.rs`
- `anchor/programs/verent_rentals/src/errors.rs`
- `anchor/programs/verent_rentals/src/events.rs`
- `anchor/programs/verent_rentals/src/state.rs`

## Deploy steps

1. Open `https://beta.solpg.io`
2. Create an Anchor project
3. Replace the generated source with the Verent scaffold
4. Build
5. Deploy to devnet
6. Save the deployed program ID

## After deploy

Update local env values:

- root `.env`
  - `VITE_VERENT_RENTALS_PROGRAM_ID=<deployed-program-id>`
- `backend/.env`
  - `VERENT_RENTALS_PROGRAM_ID=<deployed-program-id>`
  - `VERENT_USDC_MINT=<devnet-usdc-mint>`

Then restart the app services.

## Current status

This scaffold is designed to align the repo around real on-chain escrow and settlement. It still needs a real devnet deployment and program-side iteration before it can replace all off-chain rental state transitions in production.
