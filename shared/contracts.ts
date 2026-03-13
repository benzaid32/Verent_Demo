export type UserRole = 'renter' | 'owner' | 'both';

export type VerificationTier = 1 | 2 | 3;

export type ListingCategory = 'Camera' | 'Drone' | 'Lighting' | 'Compute' | 'Audio' | 'Event' | 'Other';

export type ListingAvailability = 'active' | 'rented' | 'maintenance';

export type RentalStatus =
  | 'pending_approval'
  | 'pending_pickup'
  | 'active'
  | 'return_pending'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type NotificationType = 'rental' | 'security' | 'system' | 'wallet';

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'rental_payment'
  | 'payout'
  | 'stake'
  | 'unstake'
  | 'claim_yield'
  | 'request_unstake'
  | 'finalize_unstake'
  | 'claim_rewards';

export type TransactionStatus = 'completed' | 'confirmed' | 'pending' | 'failed';

export interface Profile {
  id: string;
  email: string;
  username: string;
  walletAddress: string;
  role: UserRole;
  tier: VerificationTier;
  reputationScore: number;
  avatarUrl: string;
  bio?: string;
  notificationPreferences?: {
    rentals: boolean;
    marketing: boolean;
    security: boolean;
  };
  createdAt: string;
}

export interface WalletSnapshot {
  address: string;
  solBalance: number;
  usdcBalance: number;
  vrntBalance: number;
  vrntMint?: string;
  stakedVrntBalance: number;
  pendingYieldUsdc: number;
  claimableVrnt?: number;
  pendingUnstakeVrnt?: number;
  unstakeAvailableAt?: string;
  stakingConfigPda?: string;
  stakePositionPda?: string;
  stakeVault?: string;
  rewardVault?: string;
  updatedAt: string;
}

export interface ListingRecord {
  id: string;
  ownerId: string;
  ownerWalletAddress?: string;
  ownerName: string;
  ownerAvatar: string;
  title: string;
  description: string;
  category: ListingCategory;
  productType?: string;
  specs: string[];
  location: string;
  dailyRateUsdc: number;
  collateralValueUsdc: number;
  imageUrl: string;
  availability: ListingAvailability;
  createdAt: string;
  programId?: string;
  listingPda?: string;
  settlementMint?: string;
  chainCluster?: string;
  protocolVersion?: string;
  confirmedSignature?: string;
  confirmedSlot?: number;
}

export interface RentalRecord {
  id: string;
  listingId: string;
  itemTitle: string;
  renterId: string;
  ownerId: string;
  renterWalletAddress?: string;
  ownerWalletAddress?: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  collateralLocked: number;
  status: RentalStatus;
  thumbnail: string;
  transactionHash?: string;
  explorerUrl?: string;
  pickupCode?: string;
  returnCode?: string;
  createdAt: string;
  programId?: string;
  rentalEscrowPda?: string;
  paymentVault?: string;
  collateralVault?: string;
  settlementMint?: string;
  treasuryUsdcAccount?: string;
  statusReason?: string;
  confirmedSignature?: string;
  confirmedSlot?: number;
  chainCluster?: string;
  protocolVersion?: string;
}

export interface TransactionRecord {
  id: string;
  profileId: string;
  type: TransactionType;
  amount: number;
  currency: 'USDC' | 'SOL' | 'VRNT';
  date: string;
  status: TransactionStatus;
  hash: string;
  explorerUrl?: string;
}

export interface MessageRecord {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ConversationRecord {
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
  messages: MessageRecord[];
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: 'GPU' | 'Drone' | 'Camera' | 'Sensor';
  status: 'active' | 'rented' | 'offline' | 'maintenance';
  dailyRate: number;
  totalEarnings: number;
  uptime: number;
}

export interface DashboardPayload {
  profile: Profile;
  wallet: WalletSnapshot;
  listings: ListingRecord[];
  myListings: ListingRecord[];
  rentingRentals: RentalRecord[];
  lendingRentals: RentalRecord[];
  conversations: ConversationRecord[];
  notifications: NotificationRecord[];
  transactions: TransactionRecord[];
  devices: DeviceRecord[];
}

export interface AuthSession {
  accessToken: string;
  expiresAt: string;
  profile: Profile;
}

export interface LoginRequest {
  email: string;
  role: UserRole;
  verificationCode?: string;
  privyToken?: string;
  walletAddress?: string;
}

export interface QuoteRequest {
  listingId: string;
  days: number;
  renterId: string;
}

export interface QuoteResponse {
  listingId: string;
  days: number;
  rentalSubtotal: number;
  feeAmount: number;
  rentalTotal: number;
  requiredCollateral: number;
  totalUpfrontCost: number;
  collateralFactor: number;
}

export interface CreateRentalRequest extends QuoteRequest {
  id?: string;
  startDate: string;
  endDate: string;
  transactionHash?: string;
  explorerUrl?: string;
  confirmedSlot?: number;
  rentalEscrowPda?: string;
  paymentVault?: string;
  collateralVault?: string;
}

export interface CreateListingRequest {
  id?: string;
  title: string;
  category: ListingCategory;
  productType?: string;
  description: string;
  location: string;
  specs: string[];
  dailyRateUsdc: number;
  imageUrl?: string;
  transactionHash?: string;
  explorerUrl?: string;
  confirmedSlot?: number;
  listingPda?: string;
}

export interface UpdateListingRequest {
  title: string;
  category: ListingCategory;
  productType?: string;
  description: string;
  location: string;
  specs: string[];
  dailyRateUsdc: number;
  transactionHash?: string;
  explorerUrl?: string;
  confirmedSlot?: number;
}

export interface WithdrawRequest {
  profileId: string;
  recipientAddress: string;
  amount: number;
  currency: 'SOL' | 'USDC' | 'VRNT';
  transactionHash?: string;
  explorerUrl?: string;
}

export interface StakeRequest {
  profileId: string;
  amount?: number;
  action: 'stake' | 'request_unstake' | 'finalize_unstake' | 'claim_rewards';
  transactionHash?: string;
  explorerUrl?: string;
  confirmedSlot?: number;
}

export interface SettingsUpdateRequest {
  username: string;
  bio: string;
  notifications: {
    rentals: boolean;
    marketing: boolean;
    security: boolean;
  };
}

export interface FleetAnalysisResponse {
  summary: string;
  optimizationTips: string[];
  projectedEarnings: string;
}

export interface RentalActionRequest {
  transactionHash: string;
  explorerUrl: string;
  confirmedSlot?: number;
}

export interface RentalVerificationRequest extends RentalActionRequest {
  code: string;
}
