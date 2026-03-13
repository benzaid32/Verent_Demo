import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { env } from './env.js';
import { assertAccountExists, getTreasuryKeypair } from './solana.js';
import { buildFundRewardVaultInstruction, buildInitializeStakingConfigInstruction } from '../../shared/protocol-instructions.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  deriveAssociatedTokenAddress,
  deriveConfigPda,
  deriveRewardVaultPda,
  deriveStakeVaultPda,
  deriveStakingConfigPda,
  getProtocolProgramId
} from '../../shared/protocol.js';

function requireTreasurySigner() {
  const treasury = getTreasuryKeypair();
  if (!treasury) {
    throw new Error('TREASURY_SECRET_KEY must be configured before staking init');
  }
  return treasury;
}

function requireVrntMint() {
  if (!env.VERENT_VRNT_MINT) {
    throw new Error('VERENT_VRNT_MINT must be configured before staking init');
  }
  return env.VERENT_VRNT_MINT;
}

function getConnection() {
  return new Connection(env.SOLANA_RPC_URL, 'confirmed');
}

function buildCreateAssociatedTokenAccountInstruction(payer: Keypair, associatedAccount: string, owner: string, mint: string) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(associatedAccount), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(owner), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
    ],
    data: Buffer.alloc(0)
  });
}

async function main() {
  const connection = getConnection();
  const treasury = requireTreasurySigner();
  const vrntMint = requireVrntMint();
  const cooldownSeconds = env.VERENT_STAKING_COOLDOWN_SECONDS ?? 7 * 24 * 60 * 60;
  const rewardRatePerSecondVrnt = env.VERENT_STAKING_REWARD_RATE_VRNT_PER_SECOND ?? 0;
  const initialRewardVrnt = env.VERENT_STAKING_INITIAL_REWARD_VRNT ?? 0;
  const programId = getProtocolProgramId(env.VERENT_RENTALS_PROGRAM_ID);
  const configPda = deriveConfigPda(env.VERENT_RENTALS_PROGRAM_ID);
  const stakingConfigPda = deriveStakingConfigPda(env.VERENT_RENTALS_PROGRAM_ID);
  const stakeVault = deriveStakeVaultPda(stakingConfigPda.toBase58(), env.VERENT_RENTALS_PROGRAM_ID);
  const rewardVault = deriveRewardVaultPda(stakingConfigPda.toBase58(), env.VERENT_RENTALS_PROGRAM_ID);
  const adminVrntAta = deriveAssociatedTokenAddress(treasury.publicKey.toBase58(), vrntMint).toBase58();

  await assertAccountExists(programId.toBase58());

  const [configAccount, stakingConfigAccount, adminVrntAtaInfo] = await Promise.all([
    connection.getAccountInfo(configPda, 'confirmed'),
    connection.getAccountInfo(stakingConfigPda, 'confirmed'),
    initialRewardVrnt > 0
      ? connection.getAccountInfo(new PublicKey(adminVrntAta), 'confirmed')
      : Promise.resolve(null)
  ]);

  if (!configAccount) {
    throw new Error(`Marketplace config is missing at ${configPda.toBase58()}. Run protocol:init first.`);
  }

  const instructions: TransactionInstruction[] = [];

  if (!stakingConfigAccount) {
    const initialize = await buildInitializeStakingConfigInstruction({
      adminWalletAddress: treasury.publicKey.toBase58(),
      vrntMint,
      cooldownSeconds,
      rewardRatePerSecondVrnt,
      programId: programId.toBase58()
    });
    instructions.push(initialize.instruction);
  }

  if (initialRewardVrnt > 0) {
    if (!adminVrntAtaInfo) {
      instructions.push(
        buildCreateAssociatedTokenAccountInstruction(
          treasury,
          adminVrntAta,
          treasury.publicKey.toBase58(),
          vrntMint
        )
      );
    }

    instructions.push(await buildFundRewardVaultInstruction({
      adminWalletAddress: treasury.publicKey.toBase58(),
      vrntMint,
      amountVrnt: initialRewardVrnt,
      programId: programId.toBase58()
    }));
  }

  if (instructions.length === 0) {
    console.log(`Staking already initialized at ${stakingConfigPda.toBase58()}`);
    console.log(`Stake vault: ${stakeVault.toBase58()}`);
    console.log(`Reward vault: ${rewardVault.toBase58()}`);
    return;
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: treasury.publicKey,
    recentBlockhash: blockhash
  });

  for (const instruction of instructions) {
    transaction.add(instruction);
  }

  const signature = await sendAndConfirmTransaction(connection, transaction, [treasury], {
    commitment: 'confirmed'
  });

  console.log(`Staking initialized/funded: ${signature}`);
  console.log(`Staking config PDA: ${stakingConfigPda.toBase58()}`);
  console.log(`Stake vault: ${stakeVault.toBase58()}`);
  console.log(`Reward vault: ${rewardVault.toBase58()}`);
  if (initialRewardVrnt > 0) {
    console.log(`Admin VRNT ATA: ${adminVrntAta}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
