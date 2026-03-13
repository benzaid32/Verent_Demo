import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { expect } from 'chai';

describe('verent_rentals', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VerentRentals as Program;
  const admin = provider.wallet as anchor.Wallet;

  let usdcMint: PublicKey;
  let vrntMint: PublicKey;
  let treasuryUsdcAccount: PublicKey;
  let stakingConfigPda: PublicKey;
  let stakeVaultPda: PublicKey;
  let rewardVaultPda: PublicKey;

  const configPda = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  )[0];

  before('bootstrap mint accounts', async () => {
    usdcMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      6
    );

    treasuryUsdcAccount = await createAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      usdcMint,
      admin.publicKey
    );

    await mintTo(
      provider.connection,
      admin.payer,
      usdcMint,
      treasuryUsdcAccount,
      admin.publicKey,
      1_000_000_000
    );

    vrntMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      6
    );

    stakingConfigPda = PublicKey.findProgramAddressSync(
      [Buffer.from('staking_config')],
      program.programId
    )[0];
    stakeVaultPda = PublicKey.findProgramAddressSync(
      [Buffer.from('stake_vault'), stakingConfigPda.toBuffer()],
      program.programId
    )[0];
    rewardVaultPda = PublicKey.findProgramAddressSync(
      [Buffer.from('reward_vault'), stakingConfigPda.toBuffer()],
      program.programId
    )[0];
  });

  it('initializes marketplace config', async () => {
    await program.methods.initializeConfig({
      protocolFeeBps: 500,
      maxDisputeWindowSeconds: new anchor.BN(3 * 24 * 60 * 60)
    }).accounts({
      admin: admin.publicKey,
      config: configPda,
      usdcMint,
      treasuryUsdcAccount,
      systemProgram: SystemProgram.programId
    }).rpc();

    const config = await program.account.marketplaceConfig.fetch(configPda);
    expect(config.protocolFeeBps).to.equal(500);
    expect(config.usdcMint.toBase58()).to.equal(usdcMint.toBase58());
  });

  it('documents the happy-path scaffolding for listing and escrow flows', async () => {
    const owner = anchor.web3.Keypair.generate();
    const renter = anchor.web3.Keypair.generate();
    const listingSeedHash = Buffer.alloc(32, 1);
    const rentalSeedHash = Buffer.alloc(32, 2);
    const listingPda = PublicKey.findProgramAddressSync(
      [Buffer.from('listing'), owner.publicKey.toBuffer(), listingSeedHash],
      program.programId
    )[0];
    const escrowPda = PublicKey.findProgramAddressSync(
      [Buffer.from('rental'), listingPda.toBuffer(), renter.publicKey.toBuffer(), rentalSeedHash],
      program.programId
    )[0];
    const paymentVault = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_vault'), escrowPda.toBuffer()],
      program.programId
    )[0];
    const collateralVault = PublicKey.findProgramAddressSync(
      [Buffer.from('collateral_vault'), escrowPda.toBuffer()],
      program.programId
    )[0];

    expect(listingPda).to.be.instanceOf(PublicKey);
    expect(escrowPda).to.be.instanceOf(PublicKey);
    expect(paymentVault.toBase58()).to.not.equal(collateralVault.toBase58());
  });

  it('initializes staking config and vault PDAs', async () => {
    await program.methods.initializeStakingConfig({
      cooldownSeconds: new anchor.BN(7 * 24 * 60 * 60),
      rewardRatePerSecond: new anchor.BN(1_000_000)
    }).accounts({
      admin: admin.publicKey,
      config: configPda,
      stakingConfig: stakingConfigPda,
      vrntMint,
      stakeVault: stakeVaultPda,
      rewardVault: rewardVaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    }).rpc();

    const stakingConfig = await program.account.stakingConfig.fetch(stakingConfigPda);
    expect(stakingConfig.vrntMint.toBase58()).to.equal(vrntMint.toBase58());
    expect(stakingConfig.stakeVault.toBase58()).to.equal(stakeVaultPda.toBase58());
    expect(stakingConfig.rewardVault.toBase58()).to.equal(rewardVaultPda.toBase58());
  });
});
