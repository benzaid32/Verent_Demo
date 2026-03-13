import type { ListingRecord, Profile, QuoteResponse } from '../../shared/contracts.js';

export function getCollateralFactor(profile: Profile) {
  switch (profile.tier) {
    case 3:
      return 0.1;
    case 2:
      return 0.5;
    default:
      return 1;
  }
}

export function buildQuote(listing: ListingRecord, profile: Profile, days: number): QuoteResponse {
  const safeDays = Math.max(1, days);
  const rentalSubtotal = listing.dailyRateUsdc * safeDays;
  const feeAmount = rentalSubtotal * 0.05;
  const rentalTotal = rentalSubtotal + feeAmount;
  const collateralFactor = getCollateralFactor(profile);
  const requiredCollateral = listing.collateralValueUsdc * collateralFactor;
  return {
    listingId: listing.id,
    days: safeDays,
    rentalSubtotal,
    feeAmount,
    rentalTotal,
    requiredCollateral,
    totalUpfrontCost: rentalTotal + requiredCollateral,
    collateralFactor
  };
}
