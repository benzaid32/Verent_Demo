use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;

use constants::*;
use errors::VerentError;
use events::*;
use state::*;

declare_id!("KYXbFTyxAJuXAz2MeVC49wAj2MadW61TH86oVhaVrUk");

#[program]
pub mod verent_rentals {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
        require!(args.protocol_fee_bps as u64 <= MAX_PROTOCOL_FEE_BPS as u64, VerentError::InvalidProtocolFee);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.treasury_usdc_account = ctx.accounts.treasury_usdc_account.key();
        config.protocol_fee_bps = args.protocol_fee_bps;
        config.max_dispute_window_seconds = args.max_dispute_window_seconds;
        config.paused = false;
        config.bump = ctx.bumps.config;

        emit!(ConfigInitialized {
            admin: config.admin,
            usdc_mint: config.usdc_mint,
            treasury_usdc_account: config.treasury_usdc_account,
            protocol_fee_bps: config.protocol_fee_bps,
        });

        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, args: InitializeConfigArgs, paused: bool) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, VerentError::UnauthorizedAdmin);
        require!(args.protocol_fee_bps as u64 <= MAX_PROTOCOL_FEE_BPS as u64, VerentError::InvalidProtocolFee);

        let config = &mut ctx.accounts.config;
        config.protocol_fee_bps = args.protocol_fee_bps;
        config.max_dispute_window_seconds = args.max_dispute_window_seconds;
        config.paused = paused;
        Ok(())
    }

    pub fn initialize_staking_config(ctx: Context<InitializeStakingConfig>, args: InitializeStakingConfigArgs) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, VerentError::UnauthorizedAdmin);
        require!(args.cooldown_seconds >= 0, VerentError::InvalidCooldown);

        let now = Clock::get()?.unix_timestamp;
        let staking_config = &mut ctx.accounts.staking_config;
        staking_config.marketplace_config = ctx.accounts.config.key();
        staking_config.admin = ctx.accounts.admin.key();
        staking_config.vrnt_mint = ctx.accounts.vrnt_mint.key();
        staking_config.stake_vault = ctx.accounts.stake_vault.key();
        staking_config.reward_vault = ctx.accounts.reward_vault.key();
        staking_config.bump = ctx.bumps.staking_config;
        staking_config.paused = false;
        staking_config.cooldown_seconds = args.cooldown_seconds;
        staking_config.reward_rate_per_second = args.reward_rate_per_second;
        staking_config.reward_last_updated_at = now;
        staking_config.reward_per_token_stored = 0;
        staking_config.total_staked = 0;

        emit!(StakingConfigInitialized {
            staking_config: staking_config.key(),
            admin: staking_config.admin,
            vrnt_mint: staking_config.vrnt_mint,
            reward_rate_per_second: staking_config.reward_rate_per_second,
            cooldown_seconds: staking_config.cooldown_seconds,
        });

        Ok(())
    }

    pub fn update_staking_config(ctx: Context<UpdateStakingConfig>, args: UpdateStakingConfigArgs) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, VerentError::UnauthorizedAdmin);
        require!(args.cooldown_seconds >= 0, VerentError::InvalidCooldown);

        let now = Clock::get()?.unix_timestamp;
        let staking_config = &mut ctx.accounts.staking_config;
        accrue_global_rewards(staking_config, now)?;
        staking_config.cooldown_seconds = args.cooldown_seconds;
        staking_config.reward_rate_per_second = args.reward_rate_per_second;
        staking_config.paused = args.paused;

        emit!(StakingConfigUpdated {
            staking_config: staking_config.key(),
            reward_rate_per_second: staking_config.reward_rate_per_second,
            cooldown_seconds: staking_config.cooldown_seconds,
            paused: staking_config.paused,
        });

        Ok(())
    }

    pub fn fund_reward_vault(ctx: Context<FundRewardVault>, amount: u64) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, VerentError::UnauthorizedAdmin);
        require!(amount > 0, VerentError::InvalidStakeAmount);

        let now = Clock::get()?.unix_timestamp;
        let staking_config = &mut ctx.accounts.staking_config;
        accrue_global_rewards(staking_config, now)?;

        transfer_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.admin_reward_account.to_account_info(),
            ctx.accounts.reward_vault.to_account_info(),
            ctx.accounts.admin.to_account_info(),
            amount,
        )?;

        emit!(RewardVaultFunded {
            staking_config: staking_config.key(),
            amount,
            reward_vault_balance: ctx.accounts.reward_vault.amount.checked_add(amount).ok_or(VerentError::MathOverflow)?,
        });

        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, VerentError::InvalidStakeAmount);
        assert_protocol_live(&ctx.accounts.config)?;
        assert_staking_live(&ctx.accounts.staking_config)?;

        let now = Clock::get()?.unix_timestamp;
        {
            let staking_config = &mut ctx.accounts.staking_config;
            accrue_global_rewards(staking_config, now)?;
        }

        {
            let staking_config = &ctx.accounts.staking_config;
            let position = &mut ctx.accounts.stake_position;

            if position.owner == Pubkey::default() {
                position.owner = ctx.accounts.staker.key();
                position.staking_config = staking_config.key();
                position.bump = ctx.bumps.stake_position;
                position.staked_amount = 0;
                position.pending_unstake_amount = 0;
                position.cooldown_end_at = 0;
                position.reward_per_token_paid = staking_config.reward_per_token_stored;
                position.rewards_accrued = 0;
            }

            require!(position.owner == ctx.accounts.staker.key(), VerentError::UnauthorizedStaker);
            require!(position.staking_config == staking_config.key(), VerentError::UnauthorizedStaker);
            accrue_position_rewards(position, staking_config)?;
        }

        transfer_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.staker_token_account.to_account_info(),
            ctx.accounts.stake_vault.to_account_info(),
            ctx.accounts.staker.to_account_info(),
            amount,
        )?;

        let position_key = ctx.accounts.stake_position.key();
        let owner = ctx.accounts.staker.key();

        {
            let position = &mut ctx.accounts.stake_position;
            position.staked_amount = position.staked_amount.checked_add(amount).ok_or(VerentError::MathOverflow)?;
        }

        let total_staked = {
            let staking_config = &mut ctx.accounts.staking_config;
            staking_config.total_staked = staking_config.total_staked.checked_add(amount).ok_or(VerentError::MathOverflow)?;
            staking_config.total_staked
        };

        emit!(StakeDeposited {
            staking_config: ctx.accounts.staking_config.key(),
            position: position_key,
            owner,
            amount,
            total_staked,
        });

        Ok(())
    }

    pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
        require!(amount > 0, VerentError::InvalidStakeAmount);

        let now = Clock::get()?.unix_timestamp;
        {
            let staking_config = &mut ctx.accounts.staking_config;
            accrue_global_rewards(staking_config, now)?;
        }

        let cooldown_end_at = {
            let staking_config = &ctx.accounts.staking_config;
            let position = &mut ctx.accounts.stake_position;
            require!(position.owner == ctx.accounts.staker.key(), VerentError::UnauthorizedStaker);
            require!(position.staking_config == staking_config.key(), VerentError::UnauthorizedStaker);
            accrue_position_rewards(position, staking_config)?;
            require!(position.staked_amount >= amount, VerentError::AmountMismatch);

            position.staked_amount = position.staked_amount.checked_sub(amount).ok_or(VerentError::MathOverflow)?;
            position.pending_unstake_amount = position.pending_unstake_amount.checked_add(amount).ok_or(VerentError::MathOverflow)?;
            position.cooldown_end_at = now.checked_add(staking_config.cooldown_seconds).ok_or(VerentError::MathOverflow)?;
            position.cooldown_end_at
        };

        {
            let staking_config = &mut ctx.accounts.staking_config;
            staking_config.total_staked = staking_config.total_staked.checked_sub(amount).ok_or(VerentError::MathOverflow)?;
        }

        emit!(UnstakeRequested {
            staking_config: ctx.accounts.staking_config.key(),
            position: ctx.accounts.stake_position.key(),
            owner: ctx.accounts.staker.key(),
            amount,
            cooldown_end_at,
        });

        Ok(())
    }

    pub fn finalize_unstake(ctx: Context<FinalizeUnstake>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let position = &ctx.accounts.stake_position;
        require!(position.owner == ctx.accounts.staker.key(), VerentError::UnauthorizedStaker);
        require!(position.pending_unstake_amount > 0, VerentError::NothingToFinalize);
        require!(now >= position.cooldown_end_at, VerentError::CooldownActive);

        let staking_key = ctx.accounts.staking_config.key();
        let bump_bytes = [ctx.accounts.staking_config.bump];
        let staking_signer: &[&[u8]] = &[
            STAKING_CONFIG_SEED,
            bump_bytes.as_ref(),
        ];

        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.stake_vault.to_account_info(),
            ctx.accounts.staker_token_account.to_account_info(),
            ctx.accounts.staking_config.to_account_info(),
            staking_signer,
            position.pending_unstake_amount,
        )?;

        let amount = position.pending_unstake_amount;
        let position = &mut ctx.accounts.stake_position;
        position.pending_unstake_amount = 0;
        position.cooldown_end_at = 0;

        emit!(UnstakeFinalized {
            staking_config: staking_key,
            position: position.key(),
            owner: ctx.accounts.staker.key(),
            amount,
        });

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        {
            let staking_config = &mut ctx.accounts.staking_config;
            accrue_global_rewards(staking_config, now)?;
        }

        {
            let staking_config = &ctx.accounts.staking_config;
            let position = &mut ctx.accounts.stake_position;
            require!(position.owner == ctx.accounts.staker.key(), VerentError::UnauthorizedStaker);
            require!(position.staking_config == staking_config.key(), VerentError::UnauthorizedStaker);
            accrue_position_rewards(position, staking_config)?;
        }

        let amount = ctx.accounts.stake_position.rewards_accrued;
        require!(amount > 0, VerentError::NothingToClaim);
        require!(ctx.accounts.reward_vault.amount >= amount, VerentError::InsufficientRewardLiquidity);

        let staking_key = ctx.accounts.staking_config.key();
        let bump_bytes = [ctx.accounts.staking_config.bump];
        let staking_signer: &[&[u8]] = &[
            STAKING_CONFIG_SEED,
            bump_bytes.as_ref(),
        ];

        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.reward_vault.to_account_info(),
            ctx.accounts.staker_token_account.to_account_info(),
            ctx.accounts.staking_config.to_account_info(),
            staking_signer,
            amount,
        )?;

        let position = &mut ctx.accounts.stake_position;
        position.rewards_accrued = 0;

        emit!(RewardsClaimed {
            staking_config: staking_key,
            position: position.key(),
            owner: ctx.accounts.staker.key(),
            amount,
        });

        Ok(())
    }

    pub fn register_listing(ctx: Context<RegisterListing>, args: RegisterListingArgs) -> Result<()> {
        assert_protocol_live(&ctx.accounts.config)?;
        require!(args.min_days > 0 && args.max_days >= args.min_days, VerentError::InvalidRentalDuration);

        let listing = &mut ctx.accounts.listing;
        listing.owner = ctx.accounts.owner.key();
        listing.bump = ctx.bumps.listing;
        listing.is_active = true;
        listing.listing_seed_hash = args.listing_seed_hash;
        listing.metadata_hash = args.metadata_hash;
        listing.location_hash = args.location_hash;
        listing.daily_rate_usdc = args.daily_rate_usdc;
        listing.collateral_usdc = args.collateral_usdc;
        listing.min_days = args.min_days;
        listing.max_days = args.max_days;

        emit!(ListingRegistered {
            listing: listing.key(),
            owner: listing.owner,
            listing_seed_hash: listing.listing_seed_hash,
            daily_rate_usdc: listing.daily_rate_usdc,
            collateral_usdc: listing.collateral_usdc,
        });

        Ok(())
    }

    pub fn update_listing(ctx: Context<UpdateListing>, args: UpdateListingArgs) -> Result<()> {
        assert_protocol_live(&ctx.accounts.config)?;
        require!(ctx.accounts.owner.key() == ctx.accounts.listing.owner, VerentError::UnauthorizedOwner);
        require!(args.min_days > 0 && args.max_days >= args.min_days, VerentError::InvalidRentalDuration);

        let listing = &mut ctx.accounts.listing;
        listing.metadata_hash = args.metadata_hash;
        listing.location_hash = args.location_hash;
        listing.daily_rate_usdc = args.daily_rate_usdc;
        listing.collateral_usdc = args.collateral_usdc;
        listing.min_days = args.min_days;
        listing.max_days = args.max_days;
        listing.is_active = args.is_active;

        emit!(ListingUpdated {
            listing: listing.key(),
            owner: listing.owner,
            is_active: listing.is_active,
        });

        Ok(())
    }

    pub fn create_rental_escrow(ctx: Context<CreateRentalEscrow>, args: CreateRentalEscrowArgs) -> Result<()> {
        assert_protocol_live(&ctx.accounts.config)?;
        require!(ctx.accounts.listing.is_active, VerentError::ListingInactive);

        let rental_days = rental_days_between(args.start_ts, args.end_ts)?;
        require!(
            rental_days >= ctx.accounts.listing.min_days as i64 && rental_days <= ctx.accounts.listing.max_days as i64,
            VerentError::InvalidRentalDuration
        );

        let expected_fee = calculate_fee(args.rental_amount, ctx.accounts.config.protocol_fee_bps)?;
        let escrow = &mut ctx.accounts.escrow;
        escrow.rental_seed_hash = args.rental_seed_hash;
        escrow.listing = ctx.accounts.listing.key();
        escrow.renter = ctx.accounts.renter.key();
        escrow.owner = ctx.accounts.owner.key();
        escrow.payment_vault = ctx.accounts.payment_vault.key();
        escrow.collateral_vault = ctx.accounts.collateral_vault.key();
        escrow.bump = ctx.bumps.escrow;
        escrow.dispute_open = false;
        escrow.status = RentalStatus::Created;
        escrow.start_ts = args.start_ts;
        escrow.end_ts = args.end_ts;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.accepted_at = 0;
        escrow.pickup_at = 0;
        escrow.return_at = 0;
        escrow.rental_amount = args.rental_amount;
        escrow.collateral_amount = args.collateral_amount;
        escrow.fee_amount = expected_fee;
        escrow.total_amount = args
            .rental_amount
            .checked_add(args.collateral_amount)
            .ok_or(VerentError::MathOverflow)?;
        escrow.pickup_hash = [0; 32];
        escrow.return_hash = [0; 32];
        escrow.dispute_reason_hash = [0; 32];
        escrow.cancellation_reason_hash = [0; 32];

        emit!(RentalEscrowCreated {
            escrow: escrow.key(),
            listing: ctx.accounts.listing.key(),
            renter: escrow.renter,
            owner: escrow.owner,
            rental_amount: escrow.rental_amount,
            collateral_amount: escrow.collateral_amount,
            fee_amount: escrow.fee_amount,
        });

        Ok(())
    }

    pub fn fund_rental_escrow(ctx: Context<FundRentalEscrow>) -> Result<()> {
        assert_protocol_live(&ctx.accounts.config)?;
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == RentalStatus::Created, VerentError::InvalidEscrowStatus);

        transfer_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.renter_payment_account.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow.rental_amount,
        )?;
        transfer_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.renter_payment_account.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow.collateral_amount,
        )?;

        escrow.status = RentalStatus::Funded;

        emit!(RentalEscrowFunded {
            escrow: escrow.key(),
            renter: ctx.accounts.renter.key(),
            total_locked: escrow.total_amount,
        });

        Ok(())
    }

    pub fn accept_rental(ctx: Context<AcceptRental>) -> Result<()> {
        assert_protocol_live(&ctx.accounts.config)?;
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == RentalStatus::Funded, VerentError::InvalidEscrowStatus);
        escrow.status = RentalStatus::Accepted;
        escrow.accepted_at = Clock::get()?.unix_timestamp;

        emit!(RentalAccepted {
            escrow: escrow.key(),
            owner: ctx.accounts.owner.key(),
        });

        Ok(())
    }

    pub fn cancel_rental(ctx: Context<CancelRental>, cancellation_reason_hash: [u8; 32]) -> Result<()> {
        let actor = ctx.accounts.actor.key();
        let escrow_key = ctx.accounts.escrow.key();
        let escrow_account_info = ctx.accounts.escrow.to_account_info();

        let (listing, renter, rental_seed_hash, bump, total_amount) = {
            let escrow = &ctx.accounts.escrow;
            let config = &ctx.accounts.config;

            require!(
                matches!(escrow.status, RentalStatus::Created | RentalStatus::Funded | RentalStatus::Accepted),
                VerentError::InvalidEscrowStatus
            );
            require!(
                actor == escrow.renter || actor == escrow.owner || actor == config.admin,
                VerentError::UnauthorizedParty
            );

            (
                escrow.listing,
                escrow.renter,
                escrow.rental_seed_hash,
                escrow.bump,
                escrow.total_amount,
            )
        };

        let bump_bytes = [bump];
        let escrow_signer: &[&[u8]] = &[
            RENTAL_SEED,
            listing.as_ref(),
            renter.as_ref(),
            rental_seed_hash.as_ref(),
            bump_bytes.as_ref(),
        ];

        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.renter_payment_account.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
            ctx.accounts.payment_vault.amount,
        )?;
        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter_payment_account.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
            ctx.accounts.collateral_vault.amount,
        )?;

        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
        )?;
        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info,
            escrow_signer,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.status = RentalStatus::Cancelled;
        escrow.cancellation_reason_hash = cancellation_reason_hash;

        emit!(RentalCancelled {
            escrow: escrow_key,
            actor,
            refunded_amount: total_amount,
        });

        Ok(())
    }

    pub fn confirm_pickup(ctx: Context<ConfirmPickup>, pickup_hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == RentalStatus::Accepted, VerentError::InvalidEscrowStatus);
        escrow.status = RentalStatus::Active;
        escrow.pickup_hash = pickup_hash;
        escrow.pickup_at = Clock::get()?.unix_timestamp;

        emit!(RentalPickupConfirmed {
            escrow: escrow.key(),
            owner: ctx.accounts.owner.key(),
            pickup_hash,
        });

        Ok(())
    }

    pub fn confirm_return(ctx: Context<ConfirmReturn>, return_hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == RentalStatus::Active, VerentError::InvalidEscrowStatus);
        escrow.status = RentalStatus::ReturnPending;
        escrow.return_hash = return_hash;
        escrow.return_at = Clock::get()?.unix_timestamp;

        emit!(RentalReturnConfirmed {
            escrow: escrow.key(),
            owner: ctx.accounts.owner.key(),
            return_hash,
        });

        Ok(())
    }

    pub fn complete_rental(ctx: Context<CompleteRental>) -> Result<()> {
        let escrow_key = ctx.accounts.escrow.key();
        let escrow_account_info = ctx.accounts.escrow.to_account_info();

        let (listing, renter, owner, rental_seed_hash, bump, rental_amount, fee_amount, collateral_amount) = {
            let escrow = &ctx.accounts.escrow;
            require!(escrow.status == RentalStatus::ReturnPending, VerentError::InvalidEscrowStatus);

            (
                escrow.listing,
                escrow.renter,
                escrow.owner,
                escrow.rental_seed_hash,
                escrow.bump,
                escrow.rental_amount,
                escrow.fee_amount,
                escrow.collateral_amount,
            )
        };

        let bump_bytes = [bump];
        let escrow_signer: &[&[u8]] = &[
            RENTAL_SEED,
            listing.as_ref(),
            renter.as_ref(),
            rental_seed_hash.as_ref(),
            bump_bytes.as_ref(),
        ];
        let owner_payout = rental_amount
            .checked_sub(fee_amount)
            .ok_or(VerentError::MathOverflow)?;

        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.owner_payment_account.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
            owner_payout,
        )?;
        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.treasury_usdc_account.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
            fee_amount,
        )?;
        transfer_from_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter_payment_account.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
            collateral_amount,
        )?;

        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
        )?;
        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info,
            escrow_signer,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.status = RentalStatus::Completed;

        emit!(RentalCompleted {
            escrow: escrow_key,
            owner,
            renter,
            owner_payout,
            fee_amount,
            collateral_refund: collateral_amount,
        });

        Ok(())
    }

    pub fn open_dispute(ctx: Context<OpenDispute>, reason_hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            matches!(escrow.status, RentalStatus::Active | RentalStatus::ReturnPending),
            VerentError::InvalidEscrowStatus
        );
        let actor = ctx.accounts.actor.key();
        require!(actor == escrow.renter || actor == escrow.owner, VerentError::UnauthorizedParty);

        escrow.status = RentalStatus::Disputed;
        escrow.dispute_open = true;
        escrow.dispute_reason_hash = reason_hash;

        emit!(DisputeOpened {
            escrow: escrow.key(),
            opened_by: actor,
            reason_hash,
        });

        Ok(())
    }

    pub fn resolve_dispute(ctx: Context<ResolveDispute>, args: ResolveDisputeArgs) -> Result<()> {
        let escrow_key = ctx.accounts.escrow.key();
        let escrow_account_info = ctx.accounts.escrow.to_account_info();

        let (listing, renter, rental_seed_hash, bump) = {
            let escrow = &ctx.accounts.escrow;
            require!(escrow.status == RentalStatus::Disputed, VerentError::InvalidEscrowStatus);
            require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, VerentError::UnauthorizedAdmin);

            (
                escrow.listing,
                escrow.renter,
                escrow.rental_seed_hash,
                escrow.bump,
            )
        };

        let payment_total = args
            .owner_payment
            .checked_add(args.renter_payment)
            .ok_or(VerentError::MathOverflow)?;
        let collateral_total = args
            .owner_collateral
            .checked_add(args.renter_collateral)
            .ok_or(VerentError::MathOverflow)?;

        require!(payment_total == ctx.accounts.payment_vault.amount, VerentError::InvalidPayoutSplit);
        require!(collateral_total == ctx.accounts.collateral_vault.amount, VerentError::InvalidPayoutSplit);

        let bump_bytes = [bump];
        let escrow_signer: &[&[u8]] = &[
            RENTAL_SEED,
            listing.as_ref(),
            renter.as_ref(),
            rental_seed_hash.as_ref(),
            bump_bytes.as_ref(),
        ];

        if args.owner_payment > 0 {
            transfer_from_vault(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.payment_vault.to_account_info(),
                ctx.accounts.owner_payment_account.to_account_info(),
                escrow_account_info.clone(),
                escrow_signer,
                args.owner_payment,
            )?;
        }
        if args.renter_payment > 0 {
            transfer_from_vault(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.payment_vault.to_account_info(),
                ctx.accounts.renter_payment_account.to_account_info(),
                escrow_account_info.clone(),
                escrow_signer,
                args.renter_payment,
            )?;
        }
        if args.owner_collateral > 0 {
            transfer_from_vault(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.collateral_vault.to_account_info(),
                ctx.accounts.owner_payment_account.to_account_info(),
                escrow_account_info.clone(),
                escrow_signer,
                args.owner_collateral,
            )?;
        }
        if args.renter_collateral > 0 {
            transfer_from_vault(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.collateral_vault.to_account_info(),
                ctx.accounts.renter_payment_account.to_account_info(),
                escrow_account_info.clone(),
                escrow_signer,
                args.renter_collateral,
            )?;
        }

        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.payment_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info.clone(),
            escrow_signer,
        )?;
        close_vault(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.collateral_vault.to_account_info(),
            ctx.accounts.renter.to_account_info(),
            escrow_account_info,
            escrow_signer,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.status = RentalStatus::Resolved;
        escrow.dispute_open = false;

        emit!(DisputeResolved {
            escrow: escrow_key,
            owner_payment: args.owner_payment,
            renter_payment: args.renter_payment,
            owner_collateral: args.owner_collateral,
            renter_collateral: args.renter_collateral,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + MarketplaceConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, MarketplaceConfig>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        constraint = treasury_usdc_account.owner == admin.key(),
        constraint = treasury_usdc_account.mint == usdc_mint.key()
    )]
    pub treasury_usdc_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
}

#[derive(Accounts)]
#[instruction(args: InitializeStakingConfigArgs)]
pub struct InitializeStakingConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        init,
        payer = admin,
        space = 8 + StakingConfig::INIT_SPACE,
        seeds = [STAKING_CONFIG_SEED],
        bump
    )]
    pub staking_config: Account<'info, StakingConfig>,
    pub vrnt_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [STAKE_VAULT_SEED, staking_config.key().as_ref()],
        bump,
        token::mint = vrnt_mint,
        token::authority = staking_config
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        seeds = [REWARD_VAULT_SEED, staking_config.key().as_ref()],
        bump,
        token::mint = vrnt_mint,
        token::authority = staking_config
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateStakingConfig<'info> {
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
}

#[derive(Accounts)]
pub struct FundRewardVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
    #[account(mut, address = staking_config.reward_vault)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = admin_reward_account.owner == admin.key(),
        constraint = admin_reward_account.mint == staking_config.vrnt_mint
    )]
    pub admin_reward_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + StakePosition::INIT_SPACE,
        seeds = [STAKE_POSITION_SEED, staking_config.key().as_ref(), staker.key().as_ref()],
        bump
    )]
    pub stake_position: Account<'info, StakePosition>,
    #[account(mut, address = staking_config.stake_vault)]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = staker_token_account.owner == staker.key(),
        constraint = staker_token_account.mint == staking_config.vrnt_mint
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    pub staker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
    #[account(
        mut,
        seeds = [STAKE_POSITION_SEED, staking_config.key().as_ref(), staker.key().as_ref()],
        bump = stake_position.bump
    )]
    pub stake_position: Account<'info, StakePosition>,
}

#[derive(Accounts)]
pub struct FinalizeUnstake<'info> {
    pub staker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
    #[account(
        mut,
        seeds = [STAKE_POSITION_SEED, staking_config.key().as_ref(), staker.key().as_ref()],
        bump = stake_position.bump
    )]
    pub stake_position: Account<'info, StakePosition>,
    #[account(mut, address = staking_config.stake_vault)]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = staker_token_account.owner == staker.key(),
        constraint = staker_token_account.mint == staking_config.vrnt_mint
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    pub staker: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [STAKING_CONFIG_SEED],
        bump = staking_config.bump,
        constraint = staking_config.marketplace_config == config.key()
    )]
    pub staking_config: Account<'info, StakingConfig>,
    #[account(
        mut,
        seeds = [STAKE_POSITION_SEED, staking_config.key().as_ref(), staker.key().as_ref()],
        bump = stake_position.bump
    )]
    pub stake_position: Account<'info, StakePosition>,
    #[account(mut, address = staking_config.reward_vault)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = staker_token_account.owner == staker.key(),
        constraint = staker_token_account.mint == staking_config.vrnt_mint
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(args: RegisterListingArgs)]
pub struct RegisterListing<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::INIT_SPACE,
        seeds = [LISTING_SEED, owner.key().as_ref(), args.listing_seed_hash.as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateListing<'info> {
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        seeds = [LISTING_SEED, listing.owner.as_ref(), listing.listing_seed_hash.as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
}

#[derive(Accounts)]
#[instruction(args: CreateRentalEscrowArgs)]
pub struct CreateRentalEscrow<'info> {
    #[account(mut)]
    pub renter: Signer<'info>,
    /// CHECK: listing owner is validated against the listing account
    pub owner: UncheckedAccount<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, MarketplaceConfig>>,
    #[account(
        seeds = [LISTING_SEED, listing.owner.as_ref(), listing.listing_seed_hash.as_ref()],
        bump = listing.bump,
        constraint = listing.owner == owner.key()
    )]
    pub listing: Box<Account<'info, Listing>>,
    #[account(
        init,
        payer = renter,
        space = 8 + RentalEscrow::INIT_SPACE,
        seeds = [RENTAL_SEED, listing.key().as_ref(), renter.key().as_ref(), args.rental_seed_hash.as_ref()],
        bump
    )]
    pub escrow: Box<Account<'info, RentalEscrow>>,
    #[account(
        init,
        payer = renter,
        seeds = [PAYMENT_VAULT_SEED, escrow.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = renter,
        seeds = [COLLATERAL_VAULT_SEED, escrow.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FundRentalEscrow<'info> {
    #[account(mut)]
    pub renter: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(
        mut,
        has_one = renter
    )]
    pub escrow: Account<'info, RentalEscrow>,
    #[account(mut, address = escrow.payment_vault)]
    pub payment_vault: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = renter_payment_account.owner == renter.key())]
    pub renter_payment_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AcceptRental<'info> {
    pub owner: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(mut, constraint = escrow.owner == owner.key())]
    pub escrow: Account<'info, RentalEscrow>,
}

#[derive(Accounts)]
pub struct ConfirmPickup<'info> {
    pub owner: Signer<'info>,
    #[account(mut, constraint = escrow.owner == owner.key())]
    pub escrow: Account<'info, RentalEscrow>,
}

#[derive(Accounts)]
pub struct ConfirmReturn<'info> {
    pub owner: Signer<'info>,
    #[account(mut, constraint = escrow.owner == owner.key())]
    pub escrow: Account<'info, RentalEscrow>,
}

#[derive(Accounts)]
pub struct CancelRental<'info> {
    pub actor: Signer<'info>,
    #[account(mut, address = escrow.renter)]
    /// CHECK: used as lamport recipient for ATA close
    pub renter: UncheckedAccount<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(mut)]
    pub escrow: Account<'info, RentalEscrow>,
    #[account(mut, address = escrow.payment_vault)]
    pub payment_vault: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = renter_payment_account.owner == escrow.renter)]
    pub renter_payment_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CompleteRental<'info> {
    #[account(mut, address = escrow.owner)]
    pub owner: Signer<'info>,
    #[account(mut, address = escrow.renter)]
    /// CHECK: used as lamport recipient for ATA close
    pub renter: UncheckedAccount<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(mut)]
    pub escrow: Account<'info, RentalEscrow>,
    #[account(mut, address = escrow.payment_vault)]
    pub payment_vault: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.treasury_usdc_account)]
    pub treasury_usdc_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = owner_payment_account.owner == owner.key())]
    pub owner_payment_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = renter_payment_account.owner == escrow.renter)]
    pub renter_payment_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    pub actor: Signer<'info>,
    #[account(mut)]
    pub escrow: Account<'info, RentalEscrow>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub admin: Signer<'info>,
    #[account(mut, address = escrow.renter)]
    /// CHECK: used as lamport recipient for ATA close
    pub renter: UncheckedAccount<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, MarketplaceConfig>,
    #[account(mut)]
    pub escrow: Account<'info, RentalEscrow>,
    #[account(mut, address = escrow.payment_vault)]
    pub payment_vault: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = owner_payment_account.owner == escrow.owner)]
    pub owner_payment_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = renter_payment_account.owner == escrow.renter)]
    pub renter_payment_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

fn assert_protocol_live(config: &MarketplaceConfig) -> Result<()> {
    require!(!config.paused, VerentError::ProtocolPaused);
    Ok(())
}

fn assert_staking_live(staking_config: &StakingConfig) -> Result<()> {
    require!(!staking_config.paused, VerentError::StakingPaused);
    Ok(())
}

fn accrue_global_rewards(staking_config: &mut StakingConfig, now: i64) -> Result<()> {
    if now <= staking_config.reward_last_updated_at {
        return Ok(());
    }

    if staking_config.total_staked > 0 {
        let elapsed = u128::try_from(
            now.checked_sub(staking_config.reward_last_updated_at)
                .ok_or(VerentError::MathOverflow)?
        ).map_err(|_| error!(VerentError::MathOverflow))?;
        let reward = elapsed
            .checked_mul(staking_config.reward_rate_per_second as u128)
            .ok_or(VerentError::MathOverflow)?;
        let increment = reward
            .checked_mul(REWARD_PRECISION)
            .ok_or(VerentError::MathOverflow)?
            .checked_div(staking_config.total_staked as u128)
            .ok_or(VerentError::MathOverflow)?;
        staking_config.reward_per_token_stored = staking_config.reward_per_token_stored
            .checked_add(increment)
            .ok_or(VerentError::MathOverflow)?;
    }

    staking_config.reward_last_updated_at = now;
    Ok(())
}

fn accrue_position_rewards(position: &mut StakePosition, staking_config: &StakingConfig) -> Result<()> {
    let delta = staking_config.reward_per_token_stored
        .checked_sub(position.reward_per_token_paid)
        .ok_or(VerentError::MathOverflow)?;

    if delta > 0 && position.staked_amount > 0 {
        let earned = (position.staked_amount as u128)
            .checked_mul(delta)
            .ok_or(VerentError::MathOverflow)?
            .checked_div(REWARD_PRECISION)
            .ok_or(VerentError::MathOverflow)?;
        let earned_u64 = u64::try_from(earned).map_err(|_| error!(VerentError::MathOverflow))?;
        position.rewards_accrued = position.rewards_accrued
            .checked_add(earned_u64)
            .ok_or(VerentError::MathOverflow)?;
    }

    position.reward_per_token_paid = staking_config.reward_per_token_stored;
    Ok(())
}

fn calculate_fee(rental_amount: u64, protocol_fee_bps: u16) -> Result<u64> {
    rental_amount
        .checked_mul(protocol_fee_bps as u64)
        .ok_or(VerentError::MathOverflow)?
        .checked_div(BASIS_POINTS_DENOMINATOR)
        .ok_or(VerentError::MathOverflow.into())
}

fn rental_days_between(start_ts: i64, end_ts: i64) -> Result<i64> {
    let duration = end_ts.checked_sub(start_ts).ok_or(VerentError::MathOverflow)?;
    let days = duration.checked_div(86_400).ok_or(VerentError::MathOverflow)?;
    require!(days > 0, VerentError::InvalidRentalDuration);
    Ok(days)
}

fn transfer_from_user<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new(
            token_program,
            Transfer {
                from,
                to,
                authority,
            },
        ),
        amount,
    )
}

fn transfer_from_vault<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    signer_seeds: &[&[u8]],
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new_with_signer(
            token_program,
            Transfer {
                from,
                to,
                authority,
            },
            &[signer_seeds],
        ),
        amount,
    )
}

fn close_vault<'info>(
    token_program: AccountInfo<'info>,
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    token::close_account(CpiContext::new_with_signer(
        token_program,
        CloseAccount {
            account,
            destination,
            authority,
        },
        &[signer_seeds],
    ))
}
