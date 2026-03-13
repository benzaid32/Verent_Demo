import type {
  ConversationRecord,
  DashboardPayload,
  DeviceRecord,
  ListingRecord,
  NotificationRecord,
  Profile,
  RentalRecord,
  TransactionRecord,
  WalletSnapshot
} from '../../shared/contracts.js';

const now = new Date().toISOString();

export const seedProfiles: Profile[] = [
  {
    id: 'usr_123',
    email: 'demo@verent.xyz',
    username: 'verent_usr',
    walletAddress: '7XwJ9DemoWalletk9sZ',
    role: 'both',
    tier: 2,
    reputationScore: 85,
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    bio: 'Professional cinematographer and drone operator based in Seattle.',
    createdAt: now
  }
];

export const seedWallets: WalletSnapshot[] = [
  {
    address: '7XwJ9DemoWalletk9sZ',
    solBalance: 0.4502,
    usdcBalance: 12500,
    vrntBalance: 25000,
    stakedVrntBalance: 5000,
    pendingYieldUsdc: 45.2,
    updatedAt: now
  }
];

export const seedListings: ListingRecord[] = [
  {
    id: 'lst_001',
    ownerId: 'own_002',
    ownerName: 'Sarah Chen',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    title: 'RED V-RAPTOR 8K VV',
    description: 'Advanced RED cinema camera with production-ready kit.',
    category: 'Camera',
    specs: ['8K 120fps', 'RF Mount', 'Micro V-Lock'],
    location: 'Los Angeles, CA',
    dailyRateUsdc: 185,
    collateralValueUsdc: 24500,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop',
    availability: 'active',
    createdAt: now
  },
  {
    id: 'lst_002',
    ownerId: 'own_003',
    ownerName: 'SkyHigh Ops',
    ownerAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    title: 'DJI Matrice 30T',
    description: 'Enterprise drone with thermal imaging capabilities.',
    category: 'Drone',
    specs: ['41m Max Flight', 'Thermal Camera', 'IP55'],
    location: 'Seattle, WA',
    dailyRateUsdc: 120,
    collateralValueUsdc: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=1000&auto=format&fit=crop',
    availability: 'active',
    createdAt: now
  },
  {
    id: 'lst_usr_001',
    ownerId: 'usr_123',
    ownerName: 'You',
    ownerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    title: 'Sony FX6 Cinema Line',
    description: 'Personal FX6 kit with lens and case.',
    category: 'Camera',
    specs: ['Full Frame', '4K 120p', 'E-Mount'],
    location: 'San Francisco, CA',
    dailyRateUsdc: 150,
    collateralValueUsdc: 6500,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop',
    availability: 'rented',
    createdAt: now
  }
];

export const seedRentals: RentalRecord[] = [
  {
    id: 'rnt_001',
    listingId: 'lst_002',
    itemTitle: 'DJI Matrice 30T',
    renterId: 'usr_123',
    ownerId: 'own_003',
    startDate: '2026-03-15',
    endDate: '2026-03-18',
    totalCost: 360,
    collateralLocked: 4250,
    status: 'active',
    thumbnail: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=200&auto=format&fit=crop',
    createdAt: now
  },
  {
    id: 'rnt_003',
    listingId: 'lst_usr_001',
    itemTitle: 'Sony FX6 Kit',
    renterId: 'usr_999',
    ownerId: 'usr_123',
    startDate: '2026-03-12',
    endDate: '2026-03-14',
    totalCost: 300,
    collateralLocked: 6500,
    status: 'return_pending',
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=200&auto=format&fit=crop',
    createdAt: now
  }
];

export const seedTransactions: TransactionRecord[] = [
  {
    id: 'tx_1',
    profileId: 'usr_123',
    type: 'deposit',
    amount: 1500,
    currency: 'USDC',
    date: '2026-03-01',
    status: 'confirmed',
    hash: '5x...9a'
  },
  {
    id: 'tx_2',
    profileId: 'usr_123',
    type: 'stake',
    amount: 5000,
    currency: 'VRNT',
    date: '2026-03-05',
    status: 'confirmed',
    hash: '8s...2k'
  }
];

export const seedConversations: ConversationRecord[] = [
  {
    id: 'conv_1',
    participantId: 'own_003',
    participantName: 'SkyHigh Ops',
    participantAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    participantRole: 'Owner',
    relatedItemId: 'lst_002',
    relatedItemTitle: 'DJI Matrice 30T',
    lastMessage: 'The batteries are fully charged and ready for pickup.',
    lastMessageDate: '10:42 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg_1',
        senderId: 'own_003',
        text: 'Hi there! Thanks for the booking.',
        timestamp: now,
        isRead: true
      },
      {
        id: 'msg_2',
        senderId: 'usr_123',
        text: 'Great, I will be there at 2pm.',
        timestamp: now,
        isRead: true
      }
    ]
  }
];

export const seedNotifications: NotificationRecord[] = [
  {
    id: 'not_1',
    type: 'rental',
    title: 'Rental Approved',
    message: 'Your request for DJI Matrice 30T has been approved by SkyHigh Ops.',
    timestamp: '2 mins ago',
    isRead: false
  },
  {
    id: 'not_2',
    type: 'security',
    title: 'New Login Detected',
    message: 'Login from Chrome on Windows detected in Seattle, WA.',
    timestamp: '1 hour ago',
    isRead: false
  }
];

export const seedDevices: DeviceRecord[] = [
  {
    id: 'dev_001',
    name: 'NVIDIA H100 Node #4',
    type: 'GPU',
    status: 'active',
    dailyRate: 180,
    totalEarnings: 4500,
    uptime: 99.9
  },
  {
    id: 'dev_002',
    name: 'DJI Matrice 30T',
    type: 'Drone',
    status: 'rented',
    dailyRate: 120,
    totalEarnings: 1200,
    uptime: 98.5
  }
];

export function buildDashboard(profileId: string): DashboardPayload {
  const profile = seedProfiles.find((item) => item.id === profileId) ?? seedProfiles[0];
  const wallet = seedWallets.find((item) => item.address === profile.walletAddress) ?? seedWallets[0];
  const myListings = seedListings.filter((item) => item.ownerId === profile.id);
  const rentingRentals = seedRentals.filter((item) => item.renterId === profile.id);
  const lendingRentals = seedRentals.filter((item) => item.ownerId === profile.id);
  const transactions = seedTransactions.filter((item) => item.profileId === profile.id);

  return {
    profile,
    wallet,
    listings: seedListings,
    myListings,
    rentingRentals,
    lendingRentals,
    conversations: seedConversations,
    notifications: seedNotifications,
    transactions,
    devices: seedDevices
  };
}
