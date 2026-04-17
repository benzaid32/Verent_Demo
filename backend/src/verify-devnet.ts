import 'dotenv/config';
import { Connection } from '@solana/web3.js';
import { env, getEnvIssues } from './env.js';
import { deriveAssociatedTokenAddress, deriveConfigPda, deriveRewardVaultPda, deriveStakeVaultPda, deriveStakingConfigPda, getProtocolProgramId } from '../../shared/protocol.js';
import { getTreasuryStatus } from './solana.js';

async function main() {
  const issues = getEnvIssues();
  if (issues.length > 0) {
    throw new Error(`Environment issues: ${issues.join(' ')}`);
  }

  if (!env.VERENT_USDC_MINT) {
    throw new Error('VERENT_USDC_MINT is not configured');
  }

  const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');
  const programId = getProtocolProgramId(env.VERENT_RENTALS_PROGRAM_ID);
  const configPda = deriveConfigPda(env.VERENT_RENTALS_PROGRAM_ID);
  const stakingConfigPda = deriveStakingConfigPda(env.VERENT_RENTALS_PROGRAM_ID);
  const stakeVaultPda = deriveStakeVaultPda(stakingConfigPda.toBase58(), env.VERENT_RENTALS_PROGRAM_ID);
  const rewardVaultPda = deriveRewardVaultPda(stakingConfigPda.toBase58(), env.VERENT_RENTALS_PROGRAM_ID);
  const treasury = getTreasuryStatus();

  const [programAccount, configAccount, stakingConfigAccount, stakeVaultAccount, rewardVaultAccount, treasuryAta] = await Promise.all([
    connection.getAccountInfo(programId, 'confirmed'),
    connection.getAccountInfo(configPda, 'confirmed'),
    connection.getAccountInfo(stakingConfigPda, 'confirmed'),
    connection.getAccountInfo(stakeVaultPda, 'confirmed'),
    connection.getAccountInfo(rewardVaultPda, 'confirmed'),
    treasury.publicKey
      ? connection.getAccountInfo(deriveAssociatedTokenAddress(treasury.publicKey, env.VERENT_USDC_MINT), 'confirmed')
      : Promise.resolve(null)
  ]);

  if (!programAccount) {
    throw new Error(`Program is not deployed on ${env.SOLANA_CLUSTER}: ${programId.toBase58()}`);
  }

  console.log(`Program deployed: ${programId.toBase58()}`);
  console.log(`Config PDA ${configAccount ? 'present' : 'missing'}: ${configPda.toBase58()}`);
  console.log(`VRNT mint configured: ${env.VERENT_VRNT_MINT ?? 'missing'}`);
  console.log(`Staking config ${stakingConfigAccount ? 'present' : 'missing'}: ${stakingConfigPda.toBase58()}`);
  console.log(`Stake vault ${stakeVaultAccount ? 'present' : 'missing'}: ${stakeVaultPda.toBase58()}`);
  console.log(`Reward vault ${rewardVaultAccount ? 'present' : 'missing'}: ${rewardVaultPda.toBase58()}`);
  console.log(`Treasury signer ${treasury.configured ? 'configured' : 'missing'}`);
  console.log(`Treasury USDC ATA ${treasuryAta ? 'present' : 'missing'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
