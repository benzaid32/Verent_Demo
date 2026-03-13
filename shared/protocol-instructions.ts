import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
  SYSVAR_RENT_PUBKEY,
  TOKEN_PROGRAM_ID,
  buildSolanaExplorerTxUrl,
  deriveAssociatedTokenAddress,
  deriveCollateralVaultPda,
  deriveConfigPda,
  deriveListingPda,
  deriveListingSeedHash,
  derivePaymentVaultPda,
  deriveRewardVaultPda,
  deriveRentalEscrowPda,
  deriveRentalSeedHash,
  deriveStakePositionPda,
  deriveStakeVaultPda,
  deriveStakingConfigPda,
  encodeFixedBytes32,
  getProtocolProgramId
} from './protocol.js';

const USDC_DECIMALS = 1_000_000;
const VRNT_DECIMALS = 1_000_000;

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function encodeU16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function encodeU64(value: number) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(Math.round(value)), true);
  return bytes;
}

function encodeI64(value: number) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, BigInt(Math.round(value)), true);
  return bytes;
}

async function getInstructionDiscriminator(name: string) {
  const source = new TextEncoder().encode(`global:${name}`);
  const digest = await crypto.subtle.digest('SHA-256', source);
  return new Uint8Array(digest).slice(0, 8);
}

function toUsdcAmount(value: number) {
  return Math.round(value * USDC_DECIMALS);
}

function toVrntAmount(value: number) {
  return Math.round(value * VRNT_DECIMALS);
}

function toUnixSeconds(date: string) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

export async function buildRegisterListingInstruction(input: {
  ownerWalletAddress: string;
  listingId: string;
  title: string;
  description: string;
  location: string;
  specs: string[];
  dailyRateUsdc: number;
  collateralUsdc: number;
  minDays?: number;
  maxDays?: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const listingPda = deriveListingPda(input.ownerWalletAddress, input.listingId, input.programId);
  const discriminator = await getInstructionDiscriminator('register_listing');
  const data = concatBytes(
    discriminator,
    deriveListingSeedHash(input.listingId),
    encodeFixedBytes32(JSON.stringify({
      title: input.title,
      description: input.description,
      specs: input.specs
    })),
    encodeFixedBytes32(input.location),
    encodeU64(toUsdcAmount(input.dailyRateUsdc)),
    encodeU64(toUsdcAmount(input.collateralUsdc)),
    encodeU16(input.minDays ?? 1),
    encodeU16(input.maxDays ?? 30)
  );

  return {
    listingPda,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: listingPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.from(data)
    })
  };
}

export async function buildUpdateListingInstruction(input: {
  ownerWalletAddress: string;
  listingPda: string;
  title: string;
  description: string;
  location: string;
  specs: string[];
  dailyRateUsdc: number;
  collateralUsdc: number;
  minDays?: number;
  maxDays?: number;
  isActive?: boolean;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const discriminator = await getInstructionDiscriminator('update_listing');
  const data = concatBytes(
    discriminator,
    encodeFixedBytes32(JSON.stringify({
      title: input.title,
      description: input.description,
      specs: input.specs
    })),
    encodeFixedBytes32(input.location),
    encodeU64(toUsdcAmount(input.dailyRateUsdc)),
    encodeU64(toUsdcAmount(input.collateralUsdc)),
    encodeU16(input.minDays ?? 1),
    encodeU16(input.maxDays ?? 30),
    new Uint8Array([input.isActive ?? true ? 1 : 0])
  );

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(input.listingPda), isSigner: false, isWritable: true }
    ],
    data: Buffer.from(data)
  });
}

export async function buildInitializeConfigInstruction(input: {
  adminWalletAddress: string;
  settlementMint: string;
  treasuryUsdcAccount: string;
  protocolFeeBps?: number;
  maxDisputeWindowSeconds?: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const discriminator = await getInstructionDiscriminator('initialize_config');
  const data = concatBytes(
    discriminator,
    encodeU16(input.protocolFeeBps ?? 500),
    encodeI64(input.maxDisputeWindowSeconds ?? (3 * 24 * 60 * 60))
  );

  return {
    configPda,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: new PublicKey(input.adminWalletAddress), isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(input.settlementMint), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(input.treasuryUsdcAccount), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.from(data)
    })
  };
}

export async function buildInitializeStakingConfigInstruction(input: {
  adminWalletAddress: string;
  vrntMint: string;
  cooldownSeconds: number;
  rewardRatePerSecondVrnt: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const stakeVault = deriveStakeVaultPda(stakingConfigPda.toBase58(), input.programId);
  const rewardVault = deriveRewardVaultPda(stakingConfigPda.toBase58(), input.programId);
  const discriminator = await getInstructionDiscriminator('initialize_staking_config');
  const data = concatBytes(
    discriminator,
    encodeI64(input.cooldownSeconds),
    encodeU64(toVrntAmount(input.rewardRatePerSecondVrnt))
  );

  return {
    stakingConfigPda,
    stakeVault,
    rewardVault,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: new PublicKey(input.adminWalletAddress), isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(input.vrntMint), isSigner: false, isWritable: false },
        { pubkey: stakeVault, isSigner: false, isWritable: true },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      data: Buffer.from(data)
    })
  };
}

export async function buildFundRewardVaultInstruction(input: {
  adminWalletAddress: string;
  vrntMint: string;
  amountVrnt: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const rewardVault = deriveRewardVaultPda(stakingConfigPda.toBase58(), input.programId);
  const adminVrntAccount = deriveAssociatedTokenAddress(input.adminWalletAddress, input.vrntMint);
  const discriminator = await getInstructionDiscriminator('fund_reward_vault');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.adminWalletAddress), isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: adminVrntAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(concatBytes(discriminator, encodeU64(toVrntAmount(input.amountVrnt))))
  });
}

export async function buildStakeInstruction(input: {
  stakerWalletAddress: string;
  vrntMint: string;
  amountVrnt: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const stakePosition = deriveStakePositionPda(stakingConfigPda.toBase58(), input.stakerWalletAddress, input.programId);
  const stakeVault = deriveStakeVaultPda(stakingConfigPda.toBase58(), input.programId);
  const stakerVrntAccount = deriveAssociatedTokenAddress(input.stakerWalletAddress, input.vrntMint);
  const discriminator = await getInstructionDiscriminator('stake');

  return {
    stakingConfigPda,
    stakePosition,
    stakeVault,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: new PublicKey(input.stakerWalletAddress), isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
        { pubkey: stakePosition, isSigner: false, isWritable: true },
        { pubkey: stakeVault, isSigner: false, isWritable: true },
        { pubkey: stakerVrntAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.from(concatBytes(discriminator, encodeU64(toVrntAmount(input.amountVrnt))))
    })
  };
}

export async function buildRequestUnstakeInstruction(input: {
  stakerWalletAddress: string;
  amountVrnt: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const stakePosition = deriveStakePositionPda(stakingConfigPda.toBase58(), input.stakerWalletAddress, input.programId);
  const discriminator = await getInstructionDiscriminator('request_unstake');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.stakerWalletAddress), isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
      { pubkey: stakePosition, isSigner: false, isWritable: true }
    ],
    data: Buffer.from(concatBytes(discriminator, encodeU64(toVrntAmount(input.amountVrnt))))
  });
}

export async function buildFinalizeUnstakeInstruction(input: {
  stakerWalletAddress: string;
  vrntMint: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const stakePosition = deriveStakePositionPda(stakingConfigPda.toBase58(), input.stakerWalletAddress, input.programId);
  const stakeVault = deriveStakeVaultPda(stakingConfigPda.toBase58(), input.programId);
  const stakerVrntAccount = deriveAssociatedTokenAddress(input.stakerWalletAddress, input.vrntMint);
  const discriminator = await getInstructionDiscriminator('finalize_unstake');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.stakerWalletAddress), isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
      { pubkey: stakePosition, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: stakerVrntAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(discriminator)
  });
}

export async function buildClaimRewardsInstruction(input: {
  stakerWalletAddress: string;
  vrntMint: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const stakingConfigPda = deriveStakingConfigPda(input.programId);
  const stakePosition = deriveStakePositionPda(stakingConfigPda.toBase58(), input.stakerWalletAddress, input.programId);
  const rewardVault = deriveRewardVaultPda(stakingConfigPda.toBase58(), input.programId);
  const stakerVrntAccount = deriveAssociatedTokenAddress(input.stakerWalletAddress, input.vrntMint);
  const discriminator = await getInstructionDiscriminator('claim_rewards');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.stakerWalletAddress), isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: stakingConfigPda, isSigner: false, isWritable: true },
      { pubkey: stakePosition, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: stakerVrntAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(discriminator)
  });
}

export async function buildCreateRentalEscrowInstructions(input: {
  listingPda: string;
  ownerWalletAddress: string;
  renterWalletAddress: string;
  rentalId: string;
  settlementMint: string;
  startDate: string;
  endDate: string;
  rentalAmountUsdc: number;
  collateralAmountUsdc: number;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const rentalEscrowPda = deriveRentalEscrowPda(input.listingPda, input.renterWalletAddress, input.rentalId, input.programId);
  const paymentVault = derivePaymentVaultPda(rentalEscrowPda.toBase58(), input.programId);
  const collateralVault = deriveCollateralVaultPda(rentalEscrowPda.toBase58(), input.programId);
  const renterPaymentAccount = deriveAssociatedTokenAddress(input.renterWalletAddress, input.settlementMint);
  const createDiscriminator = await getInstructionDiscriminator('create_rental_escrow');
  const fundDiscriminator = await getInstructionDiscriminator('fund_rental_escrow');

  const createInstruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.renterWalletAddress), isSigner: true, isWritable: true },
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: false, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(input.listingPda), isSigner: false, isWritable: false },
      { pubkey: rentalEscrowPda, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: collateralVault, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(input.settlementMint), isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(concatBytes(
      createDiscriminator,
      deriveRentalSeedHash(input.rentalId),
      encodeI64(toUnixSeconds(input.startDate)),
      encodeI64(toUnixSeconds(input.endDate)),
      encodeU64(toUsdcAmount(input.rentalAmountUsdc)),
      encodeU64(toUsdcAmount(input.collateralAmountUsdc))
    ))
  });

  const fundInstruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.renterWalletAddress), isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: rentalEscrowPda, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: collateralVault, isSigner: false, isWritable: true },
      { pubkey: renterPaymentAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(fundDiscriminator)
  });

  return {
    rentalEscrowPda,
    paymentVault,
    collateralVault,
    renterPaymentAccount,
    explorerUrl: buildSolanaExplorerTxUrl,
    instructions: [createInstruction, fundInstruction]
  };
}

export async function buildAcceptRentalInstruction(input: {
  ownerWalletAddress: string;
  rentalEscrowPda: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const discriminator = await getInstructionDiscriminator('accept_rental');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(input.rentalEscrowPda), isSigner: false, isWritable: true }
    ],
    data: Buffer.from(discriminator)
  });
}

export async function buildConfirmPickupInstruction(input: {
  ownerWalletAddress: string;
  rentalEscrowPda: string;
  pickupCode: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const discriminator = await getInstructionDiscriminator('confirm_pickup');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: false },
      { pubkey: new PublicKey(input.rentalEscrowPda), isSigner: false, isWritable: true }
    ],
    data: Buffer.from(concatBytes(discriminator, encodeFixedBytes32(input.pickupCode.trim().toUpperCase())))
  });
}

export async function buildConfirmReturnInstruction(input: {
  ownerWalletAddress: string;
  rentalEscrowPda: string;
  returnCode: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const discriminator = await getInstructionDiscriminator('confirm_return');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: false },
      { pubkey: new PublicKey(input.rentalEscrowPda), isSigner: false, isWritable: true }
    ],
    data: Buffer.from(concatBytes(discriminator, encodeFixedBytes32(input.returnCode.trim().toUpperCase())))
  });
}

export async function buildCompleteRentalInstruction(input: {
  ownerWalletAddress: string;
  renterWalletAddress: string;
  rentalEscrowPda: string;
  paymentVault: string;
  collateralVault: string;
  settlementMint: string;
  treasuryUsdcAccount: string;
  programId?: string;
}) {
  const programId = getProtocolProgramId(input.programId);
  const configPda = deriveConfigPda(input.programId);
  const ownerPaymentAccount = deriveAssociatedTokenAddress(input.ownerWalletAddress, input.settlementMint);
  const renterPaymentAccount = deriveAssociatedTokenAddress(input.renterWalletAddress, input.settlementMint);
  const discriminator = await getInstructionDiscriminator('complete_rental');

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey(input.ownerWalletAddress), isSigner: true, isWritable: true },
      { pubkey: new PublicKey(input.renterWalletAddress), isSigner: false, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(input.rentalEscrowPda), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(input.paymentVault), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(input.collateralVault), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(input.treasuryUsdcAccount), isSigner: false, isWritable: true },
      { pubkey: ownerPaymentAccount, isSigner: false, isWritable: true },
      { pubkey: renterPaymentAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.from(discriminator)
  });
}
