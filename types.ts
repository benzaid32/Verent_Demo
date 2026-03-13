import type {
  ConversationRecord,
  DeviceRecord,
  FleetAnalysisResponse,
  ListingRecord,
  NotificationRecord,
  Profile,
  QuoteResponse,
  RentalRecord,
  TransactionRecord,
  UserRole,
  VerificationTier,
  WalletSnapshot
} from './shared/contracts';

export type { UserRole, VerificationTier };

export interface User extends Omit<Profile, 'username' | 'avatarUrl' | 'createdAt'> {
  username?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface WalletState extends Omit<WalletSnapshot, 'updatedAt'> {
  updatedAt?: string;
}

export interface Transaction extends Omit<TransactionRecord, 'profileId'> {
  profileId?: string;
}

export type RentalStatus = RentalRecord['status'];

export interface Rental extends Omit<RentalRecord, 'listingId' | 'createdAt'> {
  itemId: string;
  createdAt?: string;
}

export interface Listing extends Omit<ListingRecord, 'createdAt'> {
  createdAt?: string;
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

export interface Device extends Omit<DeviceRecord, 'type' | 'status'> {
  type: DeviceType;
  status: DeviceStatus;
}

export type AIAnalysisResponse = FleetAnalysisResponse;
export type { QuoteResponse };

export type OnboardingStep = 'role' | 'email' | 'verify';

export type BookingStep = 'summary' | 'contract_check' | 'signature' | 'processing' | 'confirmed';

export type Message = ConversationRecord['messages'][number];

export type Conversation = ConversationRecord;

export type NotificationType = 'rental' | 'security' | 'system' | 'wallet';

export type Notification = NotificationRecord;
