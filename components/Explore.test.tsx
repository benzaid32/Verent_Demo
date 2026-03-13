import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Explore from './Explore';

const listings = [
  {
    id: 'lst_1',
    ownerId: 'own_1',
    ownerName: 'Owner',
    ownerAvatar: 'https://example.com/avatar.png',
    title: 'Sony FX6',
    description: 'Cinema camera',
    category: 'Camera' as const,
    specs: ['4K'],
    location: 'Seattle',
    dailyRateUsdc: 100,
    collateralValueUsdc: 5000,
    imageUrl: 'https://example.com/fx6.png',
    availability: 'active' as const,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lst_2',
    ownerId: 'own_2',
    ownerName: 'Owner 2',
    ownerAvatar: 'https://example.com/avatar2.png',
    title: 'DJI Matrice 30T',
    description: 'Enterprise drone',
    category: 'Drone' as const,
    specs: ['Thermal'],
    location: 'Austin',
    dailyRateUsdc: 120,
    collateralValueUsdc: 7000,
    imageUrl: 'https://example.com/drone.png',
    availability: 'active' as const,
    createdAt: new Date().toISOString()
  }
];

describe('Explore', () => {
  it('filters listings by text input', () => {
    const onSelectListing = vi.fn();
    render(<Explore listings={listings} onSelectListing={onSelectListing} />);

    fireEvent.change(screen.getByPlaceholderText('Search gear...'), {
      target: { value: 'drone' }
    });

    expect(screen.getByText('DJI Matrice 30T')).toBeTruthy();
    expect(screen.queryByText('Sony FX6')).toBeNull();
  });
});
