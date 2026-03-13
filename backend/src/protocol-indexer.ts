import type { ListingRecord, RentalRecord } from '../../shared/contracts.js';
import {
  VERENT_PROTOCOL_VERSION,
  deriveAssociatedTokenAddress,
  deriveCollateralVaultPda,
  deriveListingPda,
  derivePaymentVaultPda,
  deriveRentalEscrowPda
} from '../../shared/protocol.js';
import { env } from './env.js';

function getSettlementMint() {
  return env.VERENT_USDC_MINT || undefined;
}

function getProgramId() {
  return env.VERENT_RENTALS_PROGRAM_ID || undefined;
}

function getTreasuryUsdcAccount() {
  if (!env.TREASURY_PUBLIC_KEY || !env.VERENT_USDC_MINT) {
    return undefined;
  }
  return deriveAssociatedTokenAddress(env.TREASURY_PUBLIC_KEY, env.VERENT_USDC_MINT).toBase58();
}

export function attachListingProtocolMetadata(listing: ListingRecord, ownerWalletAddress?: string): ListingRecord {
  if (!ownerWalletAddress) {
    return listing;
  }

  const listingPda = deriveListingPda(ownerWalletAddress, listing.id, getProgramId()).toBase58();
  return {
    ...listing,
    programId: getProgramId(),
    listingPda,
    settlementMint: getSettlementMint(),
    chainCluster: env.SOLANA_CLUSTER,
    protocolVersion: VERENT_PROTOCOL_VERSION
  };
}

export function attachRentalProtocolMetadata(
  rental: RentalRecord,
  renterWalletAddress?: string,
  listingPda?: string
): RentalRecord {
  if (!renterWalletAddress || !listingPda) {
    return rental;
  }

  const rentalEscrowPda = deriveRentalEscrowPda(listingPda, renterWalletAddress, rental.id, getProgramId()).toBase58();
  return {
    ...rental,
    programId: getProgramId(),
    rentalEscrowPda,
    paymentVault: derivePaymentVaultPda(rentalEscrowPda, getProgramId()).toBase58(),
    collateralVault: deriveCollateralVaultPda(rentalEscrowPda, getProgramId()).toBase58(),
    settlementMint: getSettlementMint(),
    treasuryUsdcAccount: getTreasuryUsdcAccount(),
    chainCluster: env.SOLANA_CLUSTER,
    protocolVersion: VERENT_PROTOCOL_VERSION
  };
}
