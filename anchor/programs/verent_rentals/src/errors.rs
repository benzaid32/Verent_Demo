use anchor_lang::prelude::*;

#[error_code]
pub enum VerentError {
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Staking is paused")]
    StakingPaused,
    #[msg("Only the marketplace admin can perform this action")]
    UnauthorizedAdmin,
    #[msg("Only the listing owner can perform this action")]
    UnauthorizedOwner,
    #[msg("Only parties to the rental can perform this action")]
    UnauthorizedParty,
    #[msg("Stake position owner mismatch")]
    UnauthorizedStaker,
    #[msg("Listing is inactive")]
    ListingInactive,
    #[msg("Invalid listing duration")]
    InvalidRentalDuration,
    #[msg("Invalid escrow status for this action")]
    InvalidEscrowStatus,
    #[msg("Invalid staking amount")]
    InvalidStakeAmount,
    #[msg("Amount mismatch")]
    AmountMismatch,
    #[msg("Provided payout split is invalid")]
    InvalidPayoutSplit,
    #[msg("Cooldown is still active")]
    CooldownActive,
    #[msg("Nothing is available to unstake")]
    NothingToFinalize,
    #[msg("No rewards are currently claimable")]
    NothingToClaim,
    #[msg("Reward vault does not have enough tokens")]
    InsufficientRewardLiquidity,
    #[msg("Invalid reward rate")]
    InvalidRewardRate,
    #[msg("Invalid staking cooldown")]
    InvalidCooldown,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Protocol fee is above the allowed maximum")]
    InvalidProtocolFee,
}
