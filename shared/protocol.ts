import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

export const VERENT_PROTOCOL_VERSION = '0.1.0';
export const VERENT_DEFAULT_CLUSTER = 'devnet';
const DEFAULT_VERENT_RENTALS_PROGRAM_ID = 'KYXbFTyxAJuXAz2MeVC49wAj2MadW61TH86oVhaVrUk';
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
export const CONFIG_SEED = Buffer.from('config');
const STAKING_CONFIG_SEED = Buffer.from('staking_config');
const STAKE_POSITION_SEED = Buffer.from('stake_position');

const LISTING_SEED = Buffer.from('listing');
const RENTAL_SEED = Buffer.from('rental');
const PAYMENT_VAULT_SEED = Buffer.from('payment_vault');
const COLLATERAL_VAULT_SEED = Buffer.from('collateral_vault');
const STAKE_VAULT_SEED = Buffer.from('stake_vault');
const REWARD_VAULT_SEED = Buffer.from('reward_vault');

function normalizeSeedBytes(value: string) {
  const source = Buffer.from(value, 'utf8');
  if (source.length === 32) {
    return source;
  }
  if (source.length > 32) {
    return source.subarray(0, 32);
  }
  const padded = Buffer.alloc(32);
  source.copy(padded);
  return padded;
}

export function deriveConfigPda(programId?: string) {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], getProtocolProgramId(programId))[0];
}

export function deriveStakingConfigPda(programId?: string) {
  return PublicKey.findProgramAddressSync([STAKING_CONFIG_SEED], getProtocolProgramId(programId))[0];
}

function resolveConfiguredProgramId() {
  if (typeof process !== 'undefined' && process.env?.VERENT_RENTALS_PROGRAM_ID) {
    return process.env.VERENT_RENTALS_PROGRAM_ID;
  }

  if (typeof import.meta !== 'undefined') {
    const viteProgramId = (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }).env?.VITE_VERENT_RENTALS_PROGRAM_ID;
    if (viteProgramId) {
      return viteProgramId;
    }
  }

  return DEFAULT_VERENT_RENTALS_PROGRAM_ID;
}

export const VERENT_RENTALS_PROGRAM_ID = new PublicKey(resolveConfiguredProgramId());

export function getProtocolProgramId(programId?: string) {
  return programId ? new PublicKey(programId) : VERENT_RENTALS_PROGRAM_ID;
}

export function deriveListingSeedHash(listingId: string) {
  return normalizeSeedBytes(listingId);
}

export function deriveRentalSeedHash(rentalId: string) {
  return normalizeSeedBytes(rentalId);
}

export function deriveListingPda(ownerWalletAddress: string, listingId: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [LISTING_SEED, new PublicKey(ownerWalletAddress).toBuffer(), deriveListingSeedHash(listingId)],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveRentalEscrowPda(listingPda: string, renterWalletAddress: string, rentalId: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [RENTAL_SEED, new PublicKey(listingPda).toBuffer(), new PublicKey(renterWalletAddress).toBuffer(), deriveRentalSeedHash(rentalId)],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveStakePositionPda(stakingConfigPda: string, ownerWalletAddress: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [STAKE_POSITION_SEED, new PublicKey(stakingConfigPda).toBuffer(), new PublicKey(ownerWalletAddress).toBuffer()],
    getProtocolProgramId(programId)
  )[0];
}

export function derivePaymentVaultPda(rentalEscrowPda: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [PAYMENT_VAULT_SEED, new PublicKey(rentalEscrowPda).toBuffer()],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveStakeVaultPda(stakingConfigPda: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [STAKE_VAULT_SEED, new PublicKey(stakingConfigPda).toBuffer()],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveRewardVaultPda(stakingConfigPda: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [REWARD_VAULT_SEED, new PublicKey(stakingConfigPda).toBuffer()],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveCollateralVaultPda(rentalEscrowPda: string, programId?: string) {
  return PublicKey.findProgramAddressSync(
    [COLLATERAL_VAULT_SEED, new PublicKey(rentalEscrowPda).toBuffer()],
    getProtocolProgramId(programId)
  )[0];
}

export function deriveAssociatedTokenAddress(owner: string, mint: string) {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mint).toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export function encodeFixedBytes32(value: string) {
  return normalizeSeedBytes(value);
}

export function buildSolanaExplorerTxUrl(signature: string, cluster = VERENT_DEFAULT_CLUSTER) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
