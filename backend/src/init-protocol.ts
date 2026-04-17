import 'dotenv/config';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { env } from './env.js';
import { assertAccountExists, getTreasuryKeypair } from './solana.js';
import { buildInitializeConfigInstruction } from '../../shared/protocol-instructions.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, deriveAssociatedTokenAddress, deriveConfigPda, getProtocolProgramId } from '../../shared/protocol.js';

function requireTreasurySigner() {
  const treasury = getTreasuryKeypair();
  if (!treasury) {
    throw new Error('TREASURY_SECRET_KEY must be configured before protocol init');
  }
  return treasury;
}

function requireSettlementMint() {
  if (!env.VERENT_USDC_MINT) {
    throw new Error('VERENT_USDC_MINT must be configured before protocol init');
  }
  return env.VERENT_USDC_MINT;
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
  const settlementMint = requireSettlementMint();
  const programId = getProtocolProgramId(env.VERENT_RENTALS_PROGRAM_ID);
  const configPda = deriveConfigPda(env.VERENT_RENTALS_PROGRAM_ID);
  const treasuryUsdcAccount = deriveAssociatedTokenAddress(treasury.publicKey.toBase58(), settlementMint).toBase58();

  await assertAccountExists(programId.toBase58());

  const existingConfig = await connection.getAccountInfo(configPda, 'confirmed');
  if (existingConfig) {
    console.log(`Protocol already initialized at ${configPda.toBase58()}`);
    console.log(`Treasury USDC account: ${treasuryUsdcAccount}`);
    return;
  }

  const instructions: TransactionInstruction[] = [];
  const treasuryAtaInfo = await connection.getAccountInfo(deriveAssociatedTokenAddress(treasury.publicKey.toBase58(), settlementMint), 'confirmed');
  if (!treasuryAtaInfo) {
    instructions.push(
      buildCreateAssociatedTokenAccountInstruction(
        treasury,
        treasuryUsdcAccount,
        treasury.publicKey.toBase58(),
        settlementMint
      )
    );
  }

  const initialize = await buildInitializeConfigInstruction({
    adminWalletAddress: treasury.publicKey.toBase58(),
    settlementMint,
    treasuryUsdcAccount,
    programId: programId.toBase58()
  });
  instructions.push(initialize.instruction);

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

  console.log(`Protocol initialized: ${signature}`);
  console.log(`Config PDA: ${configPda.toBase58()}`);
  console.log(`Treasury USDC account: ${treasuryUsdcAccount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
