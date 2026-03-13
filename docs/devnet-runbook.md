# Devnet Runbook

## Local startup

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

Required env files:

- Root `.env` from `.env.example`
- `backend/.env` from `backend/.env.example`

Protocol workspace:

- Anchor scaffold lives in `anchor/`
- Solana Playground compatible source lives in `anchor/programs/verent_rentals/src`

## Protocol env

Frontend/root `.env`:

- `VITE_API_BASE_URL`
- `VITE_PRIVY_APP_ID`
- `VITE_PRIVY_CLIENT_ID`
- `VITE_VERENT_RENTALS_PROGRAM_ID`

Backend `.env`:

- `SOLANA_RPC_URL`
- `SOLANA_CLUSTER`
- `VERENT_RENTALS_PROGRAM_ID`
- `VERENT_USDC_MINT`
- `VERENT_VRNT_MINT`
- `VERENT_STAKING_COOLDOWN_SECONDS`
- `VERENT_STAKING_REWARD_RATE_VRNT_PER_SECOND`
- `VERENT_STAKING_INITIAL_REWARD_VRNT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_LISTINGS_BUCKET` (default: `listing-images`)

## Solana Playground flow

Use `https://beta.solpg.io` if the local machine does not have Rust / Anchor installed.

1. Create a new Anchor workspace in Solana Playground.
2. Copy the contents of `anchor/programs/verent_rentals/src/` into the Playground program.
3. Build and deploy to devnet.
4. Copy the deployed program ID into:
   - root `.env` as `VITE_VERENT_RENTALS_PROGRAM_ID`
   - `backend/.env` as `VERENT_RENTALS_PROGRAM_ID`
5. Set the devnet USDC mint used for settlement in `backend/.env` as `VERENT_USDC_MINT`.
6. Set the VRNT mint and staking env values in `backend/.env`:
   - `VERENT_VRNT_MINT`
   - `VERENT_STAKING_COOLDOWN_SECONDS`
   - `VERENT_STAKING_REWARD_RATE_VRNT_PER_SECOND`
   - `VERENT_STAKING_INITIAL_REWARD_VRNT`
7. Run:

```bash
npm --prefix backend run protocol:init
npm --prefix backend run staking:init
```

8. Restart frontend and backend.

Current deployed devnet values:

- `VERENT_RENTALS_PROGRAM_ID=KYXbFTyxAJuXAz2MeVC49wAj2MadW61TH86oVhaVrUk`
- `VERENT_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- `VERENT_VRNT_MINT=7WE8MjPCaZCWAviN3DKzTTnCpqdLj92RyPX6zb8PEJVd`
- Config PDA: `CCEUEXRDrxPmFRsGXETQexbibnQjwKyx8kKK4joqXpu4`
- Treasury USDC ATA: `79hznUxJsS6X6zDMfoPzvLvfiVyyijKoufpahFDS5mUM`

## Staking init flow

1. Make sure the treasury signer configured in `TREASURY_SECRET_KEY` holds VRNT in its associated token account.
2. Set the staking emission and cooldown env values in `backend/.env`.
3. Run `npm --prefix backend run staking:init`.
4. The script will:
   - initialize the global staking config PDA if missing
   - create PDA-owned stake and reward vaults
   - optionally fund the reward vault if `VERENT_STAKING_INITIAL_REWARD_VRNT > 0`
5. Re-run `npm --prefix backend run verify:devnet` and confirm:
   - staking config is present
   - stake vault is present
   - reward vault is present

## Health checks

- Backend health: `GET /health`
- Backend readiness: `GET /ready`
- Run `npm --prefix backend run verify:devnet`
- Frontend base URL should point at `VITE_API_BASE_URL`
- Created listings should include protocol metadata such as `listingPda`
- Created rentals should include protocol metadata such as `rentalEscrowPda`, `paymentVault`, and `collateralVault`
- Wallet bootstrap should return live staking fields such as `stakedVrntBalance`, `claimableVrnt`, and `pendingUnstakeVrnt`

## Investor demo checklist

- Verify `backend/.env` uses `SOLANA_CLUSTER=devnet`
- Verify `SOLANA_RPC_URL` is reachable
- Verify `VERENT_RENTALS_PROGRAM_ID` is set after deploy
- Verify `VERENT_USDC_MINT` points to the intended devnet settlement mint
- Verify `VERENT_VRNT_MINT` points to the deployed devnet VRNT mint
- Verify staking config/vaults are initialized and reward vault is funded for the demo
- Verify the backend returns `200` from `/ready`
- Sign in through onboarding and confirm listings load from API
- Create a listing with a real uploaded image and confirm `image_url` is a Supabase Storage URL
- Create a rental and verify a transaction hash plus explorer URL is returned
- Verify the rental payload includes protocol PDA metadata
- Open wallet history and confirm the latest transaction is visible
- Stake VRNT, request unstake, finalize after cooldown, and claim rewards from the staking screen

## Production notes

- Replace `DATA_PROVIDER=file` with `supabase`
- Store listing images in Supabase Storage and keep only the resulting public URL in `listings.image_url`
- Set real `PRIVY_APP_ID` and `PRIVY_VERIFICATION_KEY`
- Set a dedicated treasury keypair for devnet and production separately
- Move from scaffolded Anchor code to audited deployed programs before mainnet
- Rotate `BACKEND_JWT_SECRET` and Gemini API keys before external demos
