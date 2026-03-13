import { describe, expect, it } from 'vitest';
import { buildQuote } from './domain.js';

describe('buildQuote', () => {
  it('applies tier 2 collateral discount correctly', () => {
    const quote = buildQuote(
      {
        id: 'lst_1',
        ownerId: 'own_1',
        ownerName: 'Owner',
        ownerAvatar: '',
        title: 'Camera',
        description: 'Desc',
        category: 'Camera',
        specs: [],
        location: 'Seattle',
        dailyRateUsdc: 100,
        collateralValueUsdc: 1000,
        imageUrl: '',
        availability: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_1',
        email: 'demo@verent.xyz',
        username: 'demo',
        walletAddress: 'wallet_1',
        role: 'renter',
        tier: 2,
        reputationScore: 90,
        avatarUrl: '',
        createdAt: new Date().toISOString()
      },
      3
    );

    expect(quote.rentalSubtotal).toBe(300);
    expect(quote.feeAmount).toBe(15);
    expect(quote.requiredCollateral).toBe(500);
    expect(quote.totalUpfrontCost).toBe(815);
  });
});
