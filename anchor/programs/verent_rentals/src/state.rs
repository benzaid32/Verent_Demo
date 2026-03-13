use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MarketplaceConfig {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury_usdc_account: Pubkey,
    pub bump: u8,
    pub paused: bool,
    pub protocol_fee_bps: u16,
    pub max_dispute_window_seconds: i64,
}

#[account]
#[derive(InitSpace)]
pub struct StakingConfig {
    pub marketplace_config: Pubkey,
    pub admin: Pubkey,
    pub vrnt_mint: Pubkey,
    pub stake_vault: Pubkey,
    pub reward_vault: Pubkey,
    pub bump: u8,
    pub paused: bool,
    pub cooldown_seconds: i64,
    pub reward_rate_per_second: u64,
    pub reward_last_updated_at: i64,
    pub reward_per_token_stored: u128,
    pub total_staked: u64,
}

#[account]
#[derive(InitSpace)]
pub struct StakePosition {
    pub owner: Pubkey,
    pub staking_config: Pubkey,
    pub bump: u8,
    pub staked_amount: u64,
    pub pending_unstake_amount: u64,
    pub cooldown_end_at: i64,
    pub reward_per_token_paid: u128,
    pub rewards_accrued: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub owner: Pubkey,
    pub bump: u8,
    pub is_active: bool,
    pub listing_seed_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub location_hash: [u8; 32],
    pub daily_rate_usdc: u64,
    pub collateral_usdc: u64,
    pub min_days: u16,
    pub max_days: u16,
}

#[account]
#[derive(InitSpace)]
pub struct RentalEscrow {
    pub rental_seed_hash: [u8; 32],
    pub listing: Pubkey,
    pub renter: Pubkey,
    pub owner: Pubkey,
    pub payment_vault: Pubkey,
    pub collateral_vault: Pubkey,
    pub bump: u8,
    pub dispute_open: bool,
    pub status: RentalStatus,
    pub start_ts: i64,
    pub end_ts: i64,
    pub created_at: i64,
    pub accepted_at: i64,
    pub pickup_at: i64,
    pub return_at: i64,
    pub rental_amount: u64,
    pub collateral_amount: u64,
    pub fee_amount: u64,
    pub total_amount: u64,
    pub pickup_hash: [u8; 32],
    pub return_hash: [u8; 32],
    pub dispute_reason_hash: [u8; 32],
    pub cancellation_reason_hash: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RentalStatus {
    Created,
    Funded,
    Accepted,
    Active,
    ReturnPending,
    Completed,
    Cancelled,
    Disputed,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeConfigArgs {
    pub protocol_fee_bps: u16,
    pub max_dispute_window_seconds: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeStakingConfigArgs {
    pub cooldown_seconds: i64,
    pub reward_rate_per_second: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateStakingConfigArgs {
    pub cooldown_seconds: i64,
    pub reward_rate_per_second: u64,
    pub paused: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterListingArgs {
    pub listing_seed_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub location_hash: [u8; 32],
    pub daily_rate_usdc: u64,
    pub collateral_usdc: u64,
    pub min_days: u16,
    pub max_days: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateListingArgs {
    pub metadata_hash: [u8; 32],
    pub location_hash: [u8; 32],
    pub daily_rate_usdc: u64,
    pub collateral_usdc: u64,
    pub min_days: u16,
    pub max_days: u16,
    pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateRentalEscrowArgs {
    pub rental_seed_hash: [u8; 32],
    pub start_ts: i64,
    pub end_ts: i64,
    pub rental_amount: u64,
    pub collateral_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResolveDisputeArgs {
    pub owner_payment: u64,
    pub renter_payment: u64,
    pub owner_collateral: u64,
    pub renter_collateral: u64,
}
