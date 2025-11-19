
export type UserRole = 'renter' | 'owner' | 'both';

export type VerificationTier = 1 | 2 | 3;

export interface User {
  id: string;
  email: string;
  walletAddress: string;
  role: UserRole;
  tier: VerificationTier;
  reputationScore: number;
}

export interface WalletState {
  solBalance: number;
  usdcBalance: number;
  vrntBalance: number; // Liquid Governance Token
  stakedVrntBalance: number; // Staked in Safety Module
  pendingYieldUsdc: number; // Unclaimed Real Yield
  address: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'rental_payment' | 'payout' | 'stake' | 'unstake' | 'claim_yield';
  amount: number;
  currency: 'USDC' | 'SOL' | 'VRNT';
  date: string;
  status: 'completed' | 'confirmed' | 'pending' | 'failed';
  hash: string;
}

export type RentalStatus = 'pending_pickup' | 'active' | 'return_pending' | 'completed' | 'cancelled';

export interface Rental {
  id: string;
  itemId: string;
  itemTitle: string; // Denormalized for UI
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  collateralLocked: number;
  status: RentalStatus;
  thumbnail: string;
}

export interface Listing {
  id: string;
  title: string;
  category: 'Camera' | 'Drone' | 'Lighting' | 'Compute';
  description: string;
  specs: string[];
  dailyRateUsdc: number;
  collateralValueUsdc: number; // The full replacement value of the asset
  location: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string; // URL
  imageUrl: string; // URL
  availability: 'active' | 'rented' | 'maintenance';
}

export type ViewMode = 'explore' | 'dashboard' | 'listings' | 'wallet' | 'messages' | 'settings' | 'details' | 'staking';

export enum DeviceType {
  GPU = 'GPU',
  DRONE = 'Drone',
  CAMERA = 'Camera',
  SENSOR = 'Sensor'
}

export enum DeviceStatus {
  ACTIVE = 'active',
  RENTED = 'rented',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  dailyRate: number;
  totalEarnings: number;
  uptime: number;
}

export interface AIAnalysisResponse {
  summary: string;
  optimizationTips: string[];
  projectedEarnings: string;
}

export type OnboardingStep = 'role' | 'email' | 'verify';

export type BookingStep = 'summary' | 'contract_check' | 'signature' | 'processing' | 'confirmed';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantRole: 'Owner' | 'Renter';
  relatedItemId?: string;
  relatedItemTitle?: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
  messages: Message[];
}

export type NotificationType = 'rental' | 'security' | 'system' | 'wallet';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}
