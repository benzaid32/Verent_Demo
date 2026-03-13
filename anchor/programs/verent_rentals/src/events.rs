use anchor_lang::prelude::*;

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury_usdc_account: Pubkey,
    pub protocol_fee_bps: u16,
}

#[event]
pub struct StakingConfigInitialized {
    pub staking_config: Pubkey,
    pub admin: Pubkey,
    pub vrnt_mint: Pubkey,
    pub reward_rate_per_second: u64,
    pub cooldown_seconds: i64,
}

#[event]
pub struct StakingConfigUpdated {
    pub staking_config: Pubkey,
    pub reward_rate_per_second: u64,
    pub cooldown_seconds: i64,
    pub paused: bool,
}

#[event]
pub struct RewardVaultFunded {
    pub staking_config: Pubkey,
    pub amount: u64,
    pub reward_vault_balance: u64,
}

#[event]
pub struct StakeDeposited {
    pub staking_config: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct UnstakeRequested {
    pub staking_config: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub cooldown_end_at: i64,
}

#[event]
pub struct UnstakeFinalized {
    pub staking_config: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RewardsClaimed {
    pub staking_config: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ListingRegistered {
    pub listing: Pubkey,
    pub owner: Pubkey,
    pub listing_seed_hash: [u8; 32],
    pub daily_rate_usdc: u64,
    pub collateral_usdc: u64,
}

#[event]
pub struct ListingUpdated {
    pub listing: Pubkey,
    pub owner: Pubkey,
    pub is_active: bool,
}

#[event]
pub struct RentalEscrowCreated {
    pub escrow: Pubkey,
    pub listing: Pubkey,
    pub renter: Pubkey,
    pub owner: Pubkey,
    pub rental_amount: u64,
    pub collateral_amount: u64,
    pub fee_amount: u64,
}

#[event]
pub struct RentalEscrowFunded {
    pub escrow: Pubkey,
    pub renter: Pubkey,
    pub total_locked: u64,
}

#[event]
pub struct RentalAccepted {
    pub escrow: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct RentalPickupConfirmed {
    pub escrow: Pubkey,
    pub owner: Pubkey,
    pub pickup_hash: [u8; 32],
}

#[event]
pub struct RentalReturnConfirmed {
    pub escrow: Pubkey,
    pub owner: Pubkey,
    pub return_hash: [u8; 32],
}

#[event]
pub struct RentalCancelled {
    pub escrow: Pubkey,
    pub actor: Pubkey,
    pub refunded_amount: u64,
}

#[event]
pub struct RentalCompleted {
    pub escrow: Pubkey,
    pub owner: Pubkey,
    pub renter: Pubkey,
    pub owner_payout: u64,
    pub fee_amount: u64,
    pub collateral_refund: u64,
}

#[event]
pub struct DisputeOpened {
    pub escrow: Pubkey,
    pub opened_by: Pubkey,
    pub reason_hash: [u8; 32],
}

#[event]
pub struct DisputeResolved {
    pub escrow: Pubkey,
    pub owner_payment: u64,
    pub renter_payment: u64,
    pub owner_collateral: u64,
    pub renter_collateral: u64,
}
