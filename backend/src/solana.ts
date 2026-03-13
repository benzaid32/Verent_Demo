import bs58 from 'bs58';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { env } from './env.js';
import { deriveStakePositionPda, deriveStakingConfigPda } from '../../shared/protocol.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const VRNT_DECIMALS = 1_000_000;
const REWARD_PRECISION = 1_000_000_000_000n;

function getConnection() {
  return new Connection(env.SOLANA_RPC_URL, 'confirmed');
}

export async function assertSolanaRpcReady() {
  const connection = getConnection();
  await connection.getLatestBlockhash('confirmed');
}

export async function assertAccountExists(address: string) {
  const connection = getConnection();
  const account = await connection.getAccountInfo(new PublicKey(address), 'confirmed');
  if (!account) {
    throw new Error(`Expected on-chain account was not found: ${address}`);
  }
}

export async function confirmSignature(signature: string) {
  const connection = getConnection();
  const result = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true
  });
  const status = result.value;
  if (!status || status.err) {
    throw new Error(`Transaction ${signature} is not confirmed on Solana devnet`);
  }
  return status.slot;
}

export async function getSolBalance(address: string) {
  try {
    const connection = getConnection();
    const lamports = await connection.getBalance(new PublicKey(address), 'confirmed');
    return lamports / 1_000_000_000;
  } catch {
    return 0;
  }
}

export async function getSplTokenBalance(address: string, mint?: string) {
  if (!mint) {
    return 0;
  }

  try {
    const connection = getConnection();
    const response = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      { mint: new PublicKey(mint) },
      'confirmed'
    );

    return response.value.reduce((sum, account) => {
      const parsed = account.account.data.parsed;
      const uiAmount = parsed?.info?.tokenAmount?.uiAmount;
      return sum + (typeof uiAmount === 'number' ? uiAmount : 0);
    }, 0);
  } catch {
    return 0;
  }
}

function readPubkey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

function readU64(data: Buffer, offset: number) {
  return Number(data.readBigUInt64LE(offset));
}

function readI64(data: Buffer, offset: number) {
  return Number(data.readBigInt64LE(offset));
}

function readU128(data: Buffer, offset: number) {
  const low = data.readBigUInt64LE(offset);
  const high = data.readBigUInt64LE(offset + 8);
  return (high << 64n) + low;
}

function toUiVrntAmount(rawAmount: bigint | number) {
  const normalized = typeof rawAmount === 'bigint' ? Number(rawAmount) : rawAmount;
  return normalized / VRNT_DECIMALS;
}

function decodeStakingConfig(data: Buffer) {
  let offset = 8;
  const marketplaceConfig = readPubkey(data, offset); offset += 32;
  const admin = readPubkey(data, offset); offset += 32;
  const vrntMint = readPubkey(data, offset); offset += 32;
  const stakeVault = readPubkey(data, offset); offset += 32;
  const rewardVault = readPubkey(data, offset); offset += 32;
  const bump = data.readUInt8(offset); offset += 1;
  const paused = data.readUInt8(offset) === 1; offset += 1;
  const cooldownSeconds = readI64(data, offset); offset += 8;
  const rewardRatePerSecond = readU64(data, offset); offset += 8;
  const rewardLastUpdatedAt = readI64(data, offset); offset += 8;
  const rewardPerTokenStored = readU128(data, offset); offset += 16;
  const totalStaked = readU64(data, offset);

  return {
    marketplaceConfig,
    admin,
    vrntMint,
    stakeVault,
    rewardVault,
    bump,
    paused,
    cooldownSeconds,
    rewardRatePerSecond,
    rewardLastUpdatedAt,
    rewardPerTokenStored,
    totalStaked
  };
}

function decodeStakePosition(data: Buffer) {
  let offset = 8;
  const owner = readPubkey(data, offset); offset += 32;
  const stakingConfig = readPubkey(data, offset); offset += 32;
  const bump = data.readUInt8(offset); offset += 1;
  const stakedAmount = readU64(data, offset); offset += 8;
  const pendingUnstakeAmount = readU64(data, offset); offset += 8;
  const cooldownEndAt = readI64(data, offset); offset += 8;
  const rewardPerTokenPaid = readU128(data, offset); offset += 16;
  const rewardsAccrued = readU64(data, offset);

  return {
    owner,
    stakingConfig,
    bump,
    stakedAmount,
    pendingUnstakeAmount,
    cooldownEndAt,
    rewardPerTokenPaid,
    rewardsAccrued
  };
}

export async function getStakingSnapshot(ownerAddress: string, programId?: string) {
  const connection = getConnection();
  const stakingConfigPda = deriveStakingConfigPda(programId).toBase58();
  const stakePositionPda = deriveStakePositionPda(stakingConfigPda, ownerAddress, programId).toBase58();

  try {
    const [stakingConfigInfo, stakePositionInfo] = await Promise.all([
      connection.getAccountInfo(new PublicKey(stakingConfigPda), 'confirmed'),
      connection.getAccountInfo(new PublicKey(stakePositionPda), 'confirmed')
    ]);

    if (!stakingConfigInfo) {
      return {
        stakedVrntBalance: 0,
        claimableVrnt: 0,
        pendingUnstakeVrnt: 0,
        unstakeAvailableAt: undefined,
        vrntMint: undefined,
        stakingConfigPda,
        stakePositionPda,
        stakeVault: undefined,
        rewardVault: undefined
      };
    }

    const stakingConfig = decodeStakingConfig(stakingConfigInfo.data);
    if (!stakePositionInfo) {
      return {
        stakedVrntBalance: 0,
        claimableVrnt: 0,
        pendingUnstakeVrnt: 0,
        unstakeAvailableAt: undefined,
        vrntMint: stakingConfig.vrntMint,
        stakingConfigPda,
        stakePositionPda,
        stakeVault: stakingConfig.stakeVault,
        rewardVault: stakingConfig.rewardVault
      };
    }

    const position = decodeStakePosition(stakePositionInfo.data);
    const now = Math.floor(Date.now() / 1000);
    let rewardPerTokenStored = stakingConfig.rewardPerTokenStored;

    if (now > stakingConfig.rewardLastUpdatedAt && stakingConfig.totalStaked > 0) {
      const elapsed = BigInt(now - stakingConfig.rewardLastUpdatedAt);
      rewardPerTokenStored += (elapsed * BigInt(stakingConfig.rewardRatePerSecond) * REWARD_PRECISION) / BigInt(stakingConfig.totalStaked);
    }

    const rewardDelta = rewardPerTokenStored - position.rewardPerTokenPaid;
    const earned = rewardDelta > 0n
      ? (BigInt(position.stakedAmount) * rewardDelta) / REWARD_PRECISION
      : 0n;
    const claimableRaw = BigInt(position.rewardsAccrued) + earned;

    return {
      stakedVrntBalance: toUiVrntAmount(position.stakedAmount),
      claimableVrnt: toUiVrntAmount(claimableRaw),
      pendingUnstakeVrnt: toUiVrntAmount(position.pendingUnstakeAmount),
      unstakeAvailableAt: position.pendingUnstakeAmount > 0 && position.cooldownEndAt > 0
        ? new Date(position.cooldownEndAt * 1000).toISOString()
        : undefined,
      vrntMint: stakingConfig.vrntMint,
      stakingConfigPda,
      stakePositionPda,
      stakeVault: stakingConfig.stakeVault,
      rewardVault: stakingConfig.rewardVault
    };
  } catch {
    return {
      stakedVrntBalance: 0,
      claimableVrnt: 0,
      pendingUnstakeVrnt: 0,
      unstakeAvailableAt: undefined,
      vrntMint: undefined,
      stakingConfigPda,
      stakePositionPda,
      stakeVault: undefined,
      rewardVault: undefined
    };
  }
}

export function getTreasuryKeypair() {
  if (!env.TREASURY_SECRET_KEY) {
    return null;
  }

  try {
    if (env.TREASURY_SECRET_KEY.trim().startsWith('[')) {
      const secret = Uint8Array.from(JSON.parse(env.TREASURY_SECRET_KEY) as number[]);
      return Keypair.fromSecretKey(secret);
    }
    return Keypair.fromSecretKey(bs58.decode(env.TREASURY_SECRET_KEY));
  } catch {
    return null;
  }
}

export function getTreasuryStatus() {
  const treasury = getTreasuryKeypair();
  return {
    configured: Boolean(treasury),
    publicKey: treasury?.publicKey.toBase58()
  };
}

export function buildExplorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${env.SOLANA_CLUSTER}`;
}

async function submitMemo(label: string, amountLamports = 0, recipient?: string) {
  const treasury = getTreasuryKeypair();
  if (!treasury) {
    throw new Error('TREASURY_SECRET_KEY is required for backend-signed Solana transactions');
  }

  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: treasury.publicKey,
    recentBlockhash: blockhash
  });

  transaction.add(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(label, 'utf8')
    })
  );

  if (recipient && amountLamports > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: amountLamports
      })
    );
  }

  const signature = await sendAndConfirmTransaction(connection, transaction, [treasury], {
    commitment: 'confirmed'
  });

  return {
    signature,
    explorerUrl: buildExplorerUrl(signature)
  };
}

export async function submitRentalMemo(rentalId: string, totalCost: number) {
  return submitMemo(`verent:rental:${rentalId}:usdc:${totalCost.toFixed(2)}`);
}

export async function submitWithdrawalMemo(recipient: string, amount: number, currency: string) {
  const lamports = currency === 'SOL' ? Math.round(amount * 1_000_000_000) : 0;
  return submitMemo(`verent:withdraw:${currency}:${amount.toFixed(4)}`, lamports, currency === 'SOL' ? recipient : undefined);
}

export async function submitStakeMemo(profileId: string, amount: number, action: 'stake' | 'unstake') {
  return submitMemo(`verent:${action}:${profileId}:${amount.toFixed(2)}`);
}
