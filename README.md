# Verent

Verent is a Solana devnet equipment-rental platform for real-world assets such as cameras, drones, lighting, audio gear, and compute inventory.

It combines:
- Privy embedded Solana wallets
- a Fastify + Supabase backend
- an Anchor rental escrow program
- a live on-chain `VRNT` staking system that reduces renter collateral requirements

## What is live

- Real Privy-backed embedded wallet login
- Real Solana devnet listing and rental protocol metadata
- Real wallet balance reads for `SOL`, `USDC`, and `VRNT`
- Rental escrow flow with listing registration, rental funding, acceptance, pickup, return, and completion
- Real on-chain `VRNT` staking with:
  - stake
  - request unstake
  - finalize unstake after cooldown
  - claim `VRNT` rewards
- Tier-based collateral logic derived from live staked `VRNT`

## Stake-to-rent model

The platform reduces collateral requirements based on the renter's live staked `VRNT` balance:

- Tier 1: `100%` collateral
- Tier 2: `50%` collateral
- Tier 3: `10%` collateral

The tier is derived from the on-chain staking position, and rental quotes are enforced by backend logic rather than trusted from the client.

## Tech stack

- Frontend: React, Vite, TypeScript, Tailwind, Privy
- Backend: Node.js, Fastify, TypeScript, Supabase
- Chain: Solana devnet, Anchor, SPL Token
- Storage: Supabase Storage
- Testing: Vitest, Playwright

## Repo structure

```text
.
├─ anchor/      # Solana / Anchor program
├─ backend/     # Fastify API, Supabase integration, Solana verification scripts
├─ components/  # Frontend UI
├─ context/     # Frontend app context and wallet transaction flows
├─ docs/        # Devnet and Solana Playground guides
├─ shared/      # Shared contracts and Solana instruction builders
└─ supabase/    # SQL migrations
```

## Local development

Requirements:

- Node.js 20+
- npm
- Supabase project
- Privy app configured for embedded Solana wallets

Install dependencies:

```bash
npm install
npm --prefix backend install
```

Create env files:

- Root `.env` from `.env.example`
- `backend/.env` from `backend/.env.example`

Start the app:

```bash
npm run dev
npm --prefix backend run dev
```

Frontend runs on `http://localhost:3000` and backend on `http://localhost:4000`.

## Important env values

Root `.env`

```dotenv
VITE_API_BASE_URL=http://localhost:4000
VITE_PRIVY_APP_ID=
VITE_PRIVY_CLIENT_ID=
VITE_VERENT_RENTALS_PROGRAM_ID=
```

Backend `.env`

```dotenv
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_CLUSTER=devnet
VERENT_RENTALS_PROGRAM_ID=
VERENT_USDC_MINT=
VERENT_VRNT_MINT=
VERENT_STAKING_COOLDOWN_SECONDS=604800
VERENT_STAKING_REWARD_RATE_VRNT_PER_SECOND=0
VERENT_STAKING_INITIAL_REWARD_VRNT=0
```

Never commit real `.env` files or live service secrets.

## Devnet operations

Useful commands:

```bash
npm run typecheck
npm run test
npm --prefix backend run protocol:init
npm --prefix backend run staking:init
npm --prefix backend run verify:devnet
```

Detailed deployment and Playground steps live in:

- `docs/devnet-runbook.md`
- `docs/solana-playground-guide.md`

## Frontend deployment

For Vercel:

- import the repo from GitHub
- keep the project root at the repository root
- set `VITE_API_BASE_URL`
- set `VITE_PRIVY_APP_ID`
- set `VITE_PRIVY_CLIENT_ID` if your Privy app requires it
- set `VITE_VERENT_RENTALS_PROGRAM_ID`

The repo includes `vercel.json` so Vercel uses:

- install command: `npm install`
- build command: `npm run build`
- output directory: `dist`

## Public repo notes

This repo intentionally excludes:

- real env files
- generated test output
- backend build artifacts

The committed code is the source of truth; generated runtime artifacts should be rebuilt locally or in CI.
