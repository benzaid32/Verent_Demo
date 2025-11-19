
import { Listing, Rental, Transaction, User, WalletState, Device, DeviceType, DeviceStatus, Conversation, Notification } from './types';
import Helium5GHotspotImage from './assets/Helium_5G_Hotspot.png';
import Mavic3CinePremiumImage from './assets/Mavic3_Cine_Premium.jpg';
import NvidiaH100ClusterImage from './assets/NVIDIA_H100_Cluster.png';
import SonyFx6CinemaLineImage from './assets/Sony_FX6_Cinema_Line.webp';
import SonyFx6KitImage from './assets/Sony_FX6_Kit.jpg';

export const MOCK_USER: User = {
  id: 'usr_123',
  email: 'demo@verent.xyz',
  walletAddress: '7Xw...9sZ',
  role: 'both',
  tier: 2, // Tier 2: Verified (50% Collateral)
  reputationScore: 85
};

export const INITIAL_WALLET: WalletState = {
  solBalance: 0.4502,
  usdcBalance: 12500.00, 
  vrntBalance: 25000.00, // Liquid Tokens
  stakedVrntBalance: 5000.00, // Staked for Tier 2
  pendingYieldUsdc: 45.20, // Real Yield from Protocol Fees
  address: '7XwJ9...k9sZ'
};

export const MOCK_LISTINGS: Listing[] = [
  {
    id: 'lst_001',
    title: 'RED V-RAPTOR 8K VV',
    category: 'Camera',
    description: 'The most powerful and advanced RED cinema camera ever. Features a multi-format 8K sensor.',
    specs: ['8K 120fps', 'RF Mount', 'Micro V-Lock'],
    dailyRateUsdc: 185.00,
    collateralValueUsdc: 24500.00, // High replacement value
    location: 'Los Angeles, CA',
    ownerId: 'own_002',
    ownerName: 'Sarah Chen',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop',
    availability: 'active'
  },
  {
    id: 'lst_002',
    title: 'DJI Matrice 30T',
    category: 'Drone',
    description: 'Enterprise drone with thermal imaging capabilities. Perfect for inspections and search & rescue.',
    specs: ['41m Max Flight', 'Thermal Camera', 'IP55'],
    dailyRateUsdc: 120.00,
    collateralValueUsdc: 8500.00,
    location: 'Seattle, WA',
    ownerId: 'own_003',
    ownerName: 'SkyHigh Ops',
    ownerAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=1000&auto=format&fit=crop',
    availability: 'active'
  },
  {
    id: 'lst_003',
    title: 'NVIDIA H100 Cluster',
    category: 'Compute',
    description: 'Access to a high-performance H100 cluster for ML training and rendering tasks.',
    specs: ['80GB HBM3', '3.35 TB/s', 'PCIe Gen5'],
    dailyRateUsdc: 450.00,
    collateralValueUsdc: 35000.00,
    location: 'Virginia Data Center',
    ownerId: 'own_004',
    ownerName: 'Compute Co.',
    ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    imageUrl: NvidiaH100ClusterImage,
    availability: 'active'
  },
  {
    id: 'lst_004',
    title: 'Aputure 1200d Pro',
    category: 'Lighting',
    description: 'The brightest Bowens Mount LED on the market. Daylight balanced point source.',
    specs: ['1200W Output', '5600K', 'Weather Resistant'],
    dailyRateUsdc: 85.00,
    collateralValueUsdc: 3200.00,
    location: 'New York, NY',
    ownerId: 'own_005',
    ownerName: 'Indie Rentals',
    ownerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?q=80&w=1000&auto=format&fit=crop',
    availability: 'active'
  },
  // Listings owned by the current user (usr_123) for MyListings.tsx demo
  {
    id: 'lst_usr_001',
    title: 'Sony FX6 Cinema Line',
    category: 'Camera',
    description: 'My personal FX6 kit, full frame, includes 24-70mm lens.',
    specs: ['Full Frame', '4K 120p', 'E-Mount'],
    dailyRateUsdc: 150.00,
    collateralValueUsdc: 6500.00,
    location: 'San Francisco, CA',
    ownerId: 'usr_123',
    ownerName: 'Me',
    ownerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    imageUrl: SonyFx6CinemaLineImage,
    availability: 'rented'
  },
  {
    id: 'lst_usr_002',
    title: 'Mavic 3 Cine Premium',
    category: 'Drone',
    description: 'Three battery kit with RC Pro controller.',
    specs: ['5.1K ProRes', '46min Flight'],
    dailyRateUsdc: 95.00,
    collateralValueUsdc: 4800.00,
    location: 'San Francisco, CA',
    ownerId: 'usr_123',
    ownerName: 'Me',
    ownerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    imageUrl: Mavic3CinePremiumImage,
    availability: 'active'
  },
  {
    id: 'lst_usr_003',
    title: 'Helium 5G Hotspot',
    category: 'Compute',
    description: 'FreedomFi gateway for decentralized wireless coverage.',
    specs: ['5G CBRS', 'LoRaWAN', 'High Gain'],
    dailyRateUsdc: 10.00,
    collateralValueUsdc: 850.00,
    location: 'Oakland, CA',
    ownerId: 'usr_123',
    ownerName: 'Me',
    ownerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    imageUrl: Helium5GHotspotImage,
    availability: 'active'
  }
];

export const MOCK_RENTALS: Rental[] = [
  {
    id: 'rnt_001',
    itemId: 'lst_002',
    itemTitle: 'DJI Matrice 30T',
    renterId: 'usr_123',
    ownerId: 'own_003',
    startDate: '2023-10-25',
    endDate: '2023-10-28',
    totalCost: 360.00,
    collateralLocked: 4250.00,
    status: 'active',
    thumbnail: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'rnt_002',
    itemId: 'lst_004',
    itemTitle: 'Aputure 1200d Pro',
    renterId: 'usr_123',
    ownerId: 'own_005',
    startDate: '2023-11-01',
    endDate: '2023-11-02',
    totalCost: 85.00,
    collateralLocked: 1600.00,
    status: 'pending_pickup',
    thumbnail: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?q=80&w=200&auto=format&fit=crop'
  }
];

export const MOCK_LENDING: Rental[] = [
   {
    id: 'rnt_003',
    itemId: 'lst_usr_001',
    itemTitle: 'Sony FX6 Kit',
    renterId: 'usr_999',
    ownerId: 'usr_123',
    startDate: '2023-10-20',
    endDate: '2023-10-22',
    totalCost: 300.00,
    collateralLocked: 6500.00,
    status: 'return_pending',
    thumbnail: SonyFx6KitImage
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx_1', type: 'deposit', amount: 1500, currency: 'USDC', date: '2023-10-01', status: 'confirmed', hash: '5x...9a' },
  { id: 'tx_2', type: 'stake', amount: 5000, currency: 'VRNT', date: '2023-10-05', status: 'confirmed', hash: '8s...2k' },
  { id: 'tx_3', type: 'rental_payment', amount: 360, currency: 'USDC', date: '2023-10-25', status: 'confirmed', hash: '3m...2k' },
  { id: 'tx_4', type: 'claim_yield', amount: 12.50, currency: 'USDC', date: '2023-10-27', status: 'confirmed', hash: '9p...1z' },
  { id: 'tx_5', type: 'withdraw', amount: 0.5, currency: 'SOL', date: '2023-10-29', status: 'failed', hash: '2k...8p' },
];

export const REVENUE_DATA = [
  { time: '00:00', amount: 120 },
  { time: '04:00', amount: 150 },
  { time: '08:00', amount: 400 },
  { time: '12:00', amount: 380 },
  { time: '16:00', amount: 550 },
  { time: '20:00', amount: 700 },
  { time: '23:59', amount: 850 },
];

export const STAKING_HISTORY_DATA = [
  { time: 'Oct 1', tvl: 3.2, apy: 11.5 },
  { time: 'Oct 5', tvl: 3.4, apy: 11.8 },
  { time: 'Oct 10', tvl: 3.8, apy: 12.1 },
  { time: 'Oct 15', tvl: 3.9, apy: 12.0 },
  { time: 'Oct 20', tvl: 4.1, apy: 12.4 },
  { time: 'Oct 25', tvl: 4.2, apy: 12.4 },
  { time: 'Oct 30', tvl: 4.3, apy: 12.5 },
];

export const MOCK_DEVICES: Device[] = [
  {
    id: 'dev_001',
    name: 'NVIDIA H100 Node #4',
    type: DeviceType.GPU,
    status: DeviceStatus.ACTIVE,
    dailyRate: 180.00,
    totalEarnings: 4500,
    uptime: 99.9
  },
  {
    id: 'dev_002',
    name: 'DJI Matrice 30T',
    type: DeviceType.DRONE,
    status: DeviceStatus.RENTED,
    dailyRate: 120.00,
    totalEarnings: 1200,
    uptime: 98.5
  },
   {
    id: 'dev_003',
    name: 'RED V-RAPTOR',
    type: DeviceType.CAMERA,
    status: DeviceStatus.MAINTENANCE,
    dailyRate: 250.00,
    totalEarnings: 8500,
    uptime: 95.0
  },
  {
    id: 'dev_004',
    name: 'Helium IoT Gateway',
    type: DeviceType.SENSOR,
    status: DeviceStatus.ACTIVE,
    dailyRate: 5.00,
    totalEarnings: 150,
    uptime: 99.9
  }
];

export const MARKETPLACE_ITEMS = [
  {
    id: 'itm_001',
    title: 'NVIDIA A100 Cluster',
    location: 'San Francisco, CA',
    type: DeviceType.GPU,
    price: 85.00,
    unit: 'hr',
    specs: ['80GB VRAM', 'NVLink'],
    rating: 4.9,
    reviews: 120,
    availability: 'Available'
  },
  {
    id: 'itm_002',
    title: 'Sony FX6 Cinema Line',
    location: 'Los Angeles, CA',
    type: DeviceType.CAMERA,
    price: 150.00,
    unit: 'day',
    specs: ['Full Frame', '4K 120p'],
    rating: 4.8,
    reviews: 45,
    availability: 'Limited'
  },
  {
    id: 'itm_003',
    title: 'DJI Mavic 3 Cine',
    location: 'Austin, TX',
    type: DeviceType.DRONE,
    price: 95.00,
    unit: 'day',
    specs: ['5.1K ProRes', '46min Flight'],
    rating: 4.7,
    reviews: 82,
    availability: 'Available'
  },
  {
    id: 'itm_004',
    title: 'Weather Station Array',
    location: 'Miami, FL',
    type: DeviceType.SENSOR,
    price: 15.00,
    unit: 'day',
    specs: ['Temp/Humidity', 'Wind Speed'],
    rating: 4.5,
    reviews: 12,
    availability: 'Available'
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
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
        timestamp: '2023-10-25T10:30:00Z',
        isRead: true
      },
      {
        id: 'msg_2',
        senderId: 'usr_123',
        text: 'Hey, thanks. Just confirming the case includes the extra props?',
        timestamp: '2023-10-25T10:35:00Z',
        isRead: true
      },
      {
        id: 'msg_3',
        senderId: 'own_003',
        text: 'Yes, 2 sets of props and the RTK module are in the Pelican case.',
        timestamp: '2023-10-25T10:38:00Z',
        isRead: true
      },
      {
        id: 'msg_4',
        senderId: 'own_003',
        text: 'The batteries are fully charged and ready for pickup.',
        timestamp: '2023-10-25T10:42:00Z',
        isRead: false
      }
    ]
  },
  {
    id: 'conv_2',
    participantId: 'own_005',
    participantName: 'Indie Rentals',
    participantAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
    participantRole: 'Owner',
    relatedItemId: 'lst_004',
    relatedItemTitle: 'Aputure 1200d Pro',
    lastMessage: 'Perfect, see you then.',
    lastMessageDate: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_10',
        senderId: 'usr_123',
        text: 'Is 2pm okay for pickup today?',
        timestamp: '2023-10-30T13:00:00Z',
        isRead: true
      },
      {
        id: 'msg_11',
        senderId: 'own_005',
        text: 'Perfect, see you then.',
        timestamp: '2023-10-30T13:15:00Z',
        isRead: true
      }
    ]
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
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
    message: 'Login from Chrome on MacOS detected in Seattle, WA.',
    timestamp: '1 hour ago',
    isRead: false
  },
  {
    id: 'not_3',
    type: 'wallet',
    title: 'Funds Received',
    message: 'You received 12.50 SOL from 8xY...2kP.',
    timestamp: 'Yesterday',
    isRead: true
  },
  {
    id: 'not_4',
    type: 'system',
    title: 'Protocol Update',
    message: 'Verent v2.1 is live with lower transaction fees.',
    timestamp: '2 days ago',
    isRead: true
  }
];

export const TIER_CONFIG = {
    1: { limit: 500, name: 'Rookie', collateralFactor: 1.0, requirement: 'Email Verification' },
    2: { limit: 5000, name: 'Verified', collateralFactor: 0.5, requirement: 'Social Connect + Staking' },
    3: { limit: Infinity, name: 'Pro', collateralFactor: 0.1, requirement: 'KYC Identity Verification' }
};

export const MOCK_RISK_PROFILE = {
    successfulRentals: 14,
    disputeCount: 0,
    avgReturnTime: 'On Time',
    identityScore: 95, // 0-100
    socialVouches: 3
};
