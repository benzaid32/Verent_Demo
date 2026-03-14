import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ConversationRecord,
  CreateListingRequest,
  DashboardPayload,
  ListingRecord,
  NotificationRecord,
  Profile,
  RentalRecord,
  SettingsUpdateRequest,
  StakeRequest,
  TransactionRecord,
  WalletSnapshot,
  WithdrawRequest
} from '../../shared/contracts.js';
import { resolveListingImageUrl } from './listing-images.js';
import { attachListingProtocolMetadata } from './protocol-indexer.js';
import { env } from './env.js';
import { getSolBalance, getSplTokenBalance, getStakingSnapshot } from './solana.js';
import { buildDashboard, seedConversations, seedDevices, seedListings, seedNotifications, seedProfiles, seedRentals, seedTransactions, seedWallets } from './seed.js';

interface PersistedData {
  profiles: Profile[];
  wallets: WalletSnapshot[];
  listings: DashboardPayload['listings'];
  rentals: RentalRecord[];
  conversations: ConversationRecord[];
  notifications: NotificationRecord[];
  transactions: TransactionRecord[];
  devices: DashboardPayload['devices'];
}

const dataFilePath = path.resolve(process.cwd(), 'data', 'demo-db.json');

export type StorageProvider = 'file' | 'supabase';

function isSupabaseEnabled() {
  return env.DATA_PROVIDER === 'supabase';
}

function getSupabaseCredentials() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when DATA_PROVIDER=supabase');
  }
  return {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  };
}

function getSupabase() {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const credentials = getSupabaseCredentials();

  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getPersistenceStatus() {
  return {
    configuredProvider: env.DATA_PROVIDER,
    activeProvider: isSupabaseEnabled() ? 'supabase' as const : 'file' as const,
    dataFilePath,
    usingPersistentStorage: isSupabaseEnabled()
  };
}

export async function assertStorageReady() {
  if (isSupabaseEnabled()) {
    const client = getSupabase();
    const { error } = await client!.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) {
      throw new Error(`Supabase check failed: ${error.message}`);
    }
    return getPersistenceStatus();
  }

  await mkdir(path.dirname(dataFilePath), { recursive: true });
  return getPersistenceStatus();
}

function resolveWalletAddress(identity?: { walletAddress?: string }) {
  if (identity?.walletAddress) {
    return identity.walletAddress;
  }
  if (!env.DEMO_MODE) {
    throw new Error('Real wallet address is required when DEMO_MODE=false');
  }
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
}

function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    walletAddress: row.wallet_address,
    role: row.role,
    tier: row.tier,
    reputationScore: row.reputation_score,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? '',
    notificationPreferences: {
      rentals: row.notify_rentals ?? true,
      marketing: row.notify_marketing ?? false,
      security: row.notify_security ?? true
    },
    createdAt: row.created_at
  };
}

function mapWalletRow(row: any): WalletSnapshot {
  return {
    address: row.address,
    solBalance: Number(row.sol_balance),
    usdcBalance: Number(row.usdc_balance),
    vrntBalance: Number(row.vrnt_balance),
    vrntMint: row.vrnt_mint ?? undefined,
    stakedVrntBalance: Number(row.staked_vrnt_balance),
    pendingYieldUsdc: Number(row.pending_yield_usdc),
    claimableVrnt: row.claimable_vrnt !== undefined ? Number(row.claimable_vrnt) : undefined,
    pendingUnstakeVrnt: row.pending_unstake_vrnt !== undefined ? Number(row.pending_unstake_vrnt) : undefined,
    unstakeAvailableAt: row.unstake_available_at ?? undefined,
    stakingCooldownSeconds: row.staking_cooldown_seconds !== undefined ? Number(row.staking_cooldown_seconds) : undefined,
    estimatedApy: row.estimated_apy !== undefined ? Number(row.estimated_apy) : undefined,
    stakingConfigPda: row.staking_config_pda ?? undefined,
    stakePositionPda: row.stake_position_pda ?? undefined,
    stakeVault: row.stake_vault ?? undefined,
    rewardVault: row.reward_vault ?? undefined,
    updatedAt: row.updated_at
  };
}

function isLegacyMockWallet(wallet: Pick<WalletSnapshot, 'solBalance' | 'usdcBalance' | 'vrntBalance' | 'stakedVrntBalance' | 'pendingYieldUsdc'>) {
  return wallet.solBalance === 2
    && wallet.usdcBalance === 5000
    && wallet.vrntBalance === 1000
    && wallet.stakedVrntBalance === 0
    && wallet.pendingYieldUsdc === 0;
}

async function buildRealWalletSnapshot(address: string, stored?: Partial<WalletSnapshot>): Promise<WalletSnapshot> {
  const solBalance = await getSolBalance(address);
  const usdcBalance = await getSplTokenBalance(address, env.VERENT_USDC_MINT);
  const vrntBalance = await getSplTokenBalance(address, env.VERENT_VRNT_MINT);
  const staking = await getStakingSnapshot(address, env.VERENT_RENTALS_PROGRAM_ID);
  return {
    address,
    solBalance,
    usdcBalance,
    vrntBalance,
    vrntMint: staking.vrntMint ?? env.VERENT_VRNT_MINT,
    stakedVrntBalance: staking.stakedVrntBalance,
    pendingYieldUsdc: 0,
    claimableVrnt: staking.claimableVrnt,
    pendingUnstakeVrnt: staking.pendingUnstakeVrnt,
    unstakeAvailableAt: staking.unstakeAvailableAt,
    stakingCooldownSeconds: staking.stakingCooldownSeconds,
    estimatedApy: staking.estimatedApy,
    stakingConfigPda: staking.stakingConfigPda,
    stakePositionPda: staking.stakePositionPda,
    stakeVault: staking.stakeVault,
    rewardVault: staking.rewardVault,
    updatedAt: new Date().toISOString()
  };
}

function mapListingRow(row: any): DashboardPayload['listings'][number] {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerWalletAddress: row.owner_wallet_address ?? undefined,
    ownerName: row.owner_name,
    ownerAvatar: row.owner_avatar,
    title: row.title,
    description: row.description,
    category: row.category,
    productType: row.product_type ?? undefined,
    specs: row.specs ?? [],
    location: row.location,
    dailyRateUsdc: Number(row.daily_rate_usdc),
    collateralValueUsdc: Number(row.collateral_value_usdc),
    imageUrl: row.image_url,
    availability: row.availability,
    createdAt: row.created_at,
    programId: row.program_id ?? undefined,
    listingPda: row.listing_pda ?? undefined,
    settlementMint: row.settlement_mint ?? undefined,
    chainCluster: row.chain_cluster ?? undefined,
    protocolVersion: row.protocol_version ?? undefined,
    confirmedSignature: row.confirmed_signature ?? undefined,
    confirmedSlot: typeof row.confirmed_slot === 'number' ? row.confirmed_slot : undefined
  };
}

function mapRentalRow(row: any): RentalRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    itemTitle: row.item_title,
    renterId: row.renter_id,
    ownerId: row.owner_id,
    renterWalletAddress: row.renter_wallet_address ?? undefined,
    ownerWalletAddress: row.owner_wallet_address ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    totalCost: Number(row.total_cost),
    collateralLocked: Number(row.collateral_locked),
    status: row.status,
    thumbnail: row.thumbnail,
    transactionHash: row.transaction_hash ?? undefined,
    explorerUrl: row.explorer_url ?? undefined,
    pickupCode: row.pickup_code ?? undefined,
    returnCode: row.return_code ?? undefined,
    createdAt: row.created_at,
    programId: row.program_id ?? undefined,
    rentalEscrowPda: row.rental_escrow_pda ?? undefined,
    paymentVault: row.payment_vault ?? undefined,
    collateralVault: row.collateral_vault ?? undefined,
    settlementMint: row.settlement_mint ?? undefined,
    treasuryUsdcAccount: row.treasury_usdc_account ?? undefined,
    statusReason: row.status_reason ?? undefined,
    confirmedSignature: row.confirmed_signature ?? undefined,
    confirmedSlot: typeof row.confirmed_slot === 'number' ? row.confirmed_slot : undefined,
    chainCluster: row.chain_cluster ?? undefined,
    protocolVersion: row.protocol_version ?? undefined
  };
}

function mapTransactionRow(row: any): TransactionRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date,
    status: row.status,
    hash: row.hash,
    explorerUrl: row.explorer_url ?? undefined
  };
}

async function getSupabaseProfile(client: SupabaseClient, profileId: string) {
  const { data, error } = await client.from('profiles').select('*').eq('id', profileId).single();
  if (error || !data) {
    throw new Error('Profile not found');
  }
  return mapProfileRow(data);
}

function createSeedData(): PersistedData {
  return {
    profiles: structuredClone(seedProfiles),
    wallets: structuredClone(seedWallets),
    listings: structuredClone(seedListings),
    rentals: structuredClone(seedRentals),
    conversations: structuredClone(seedConversations),
    notifications: structuredClone(seedNotifications),
    transactions: structuredClone(seedTransactions),
    devices: structuredClone(seedDevices)
  };
}

async function loadData(): Promise<PersistedData> {
  try {
    const raw = await readFile(dataFilePath, 'utf8');
    return JSON.parse(raw) as PersistedData;
  } catch {
    const seed = createSeedData();
    await saveData(seed);
    return seed;
  }
}

async function saveData(data: PersistedData) {
  await mkdir(path.dirname(dataFilePath), { recursive: true });
  await writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function upsertDemoProfile(
  email: string,
  role: Profile['role'],
  identity?: {
    subject?: string;
    walletAddress?: string;
  }
) {
  const supabase = getSupabase();
  if (supabase) {
    const lookup = identity?.subject
      ? supabase.from('profiles').select('*').eq('id', identity.subject).maybeSingle()
      : supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    const { data: existing } = await lookup;
    if (existing) {
      if (identity?.walletAddress && existing.wallet_address !== identity.walletAddress) {
        const updatedAt = new Date().toISOString();
        await supabase.from('profiles').update({
          wallet_address: identity.walletAddress
        }).eq('id', existing.id);
        await supabase.from('wallets').update({
          address: identity.walletAddress,
          updated_at: updatedAt
        }).eq('profile_id', existing.id);
        existing.wallet_address = identity.walletAddress;
      }
      return mapProfileRow(existing);
    }

    const id = identity?.subject || `usr_${crypto.randomUUID().slice(0, 8)}`;
    const walletAddress = resolveWalletAddress(identity);
    const createdAt = new Date().toISOString();
    const profileRow = {
      id,
      email,
      username: email.split('@')[0],
      wallet_address: walletAddress,
      role,
      tier: 1,
      reputation_score: 0,
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
      bio: '',
      notify_rentals: true,
      notify_marketing: false,
      notify_security: true,
      created_at: createdAt
    };

    const walletRow = {
      address: walletAddress,
      profile_id: id,
      sol_balance: 0,
      usdc_balance: 0,
      vrnt_balance: 0,
      staked_vrnt_balance: 0,
      pending_yield_usdc: 0,
      updated_at: createdAt
    };

    await supabase.from('profiles').insert(profileRow);
    await supabase.from('wallets').insert(walletRow);
    return mapProfileRow(profileRow);
  }

  const data = await loadData();
  const existing = data.profiles.find((profile) =>
    identity?.subject ? profile.id === identity.subject : profile.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    if (identity?.walletAddress && existing.walletAddress !== identity.walletAddress) {
      const walletIndex = data.wallets.findIndex((item) => item.address === existing.walletAddress);
      if (walletIndex !== -1) {
        data.wallets[walletIndex] = {
          ...data.wallets[walletIndex],
          address: identity.walletAddress,
          updatedAt: new Date().toISOString()
        };
      }
      existing.walletAddress = identity.walletAddress;
      await saveData(data);
    }
    return existing;
  }

  const id = identity?.subject || `usr_${crypto.randomUUID().slice(0, 8)}`;
  const walletAddress = resolveWalletAddress(identity);
  const profile: Profile = {
    id,
    email,
    username: email.split('@')[0],
    walletAddress,
    role,
    tier: 1,
    reputationScore: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    bio: '',
    notificationPreferences: {
      rentals: true,
      marketing: false,
      security: true
    },
    createdAt: new Date().toISOString()
  };

  const wallet: WalletSnapshot = {
    address: walletAddress,
    solBalance: 0,
    usdcBalance: 0,
    vrntBalance: 0,
    stakedVrntBalance: 0,
    pendingYieldUsdc: 0,
    updatedAt: new Date().toISOString()
  };

  data.profiles.push(profile);
  data.wallets.push(wallet);
  await saveData(data);
  return profile;
}

export async function getDashboard(profileId: string): Promise<DashboardPayload> {
  const supabase = getSupabase();
  if (supabase) {
    let profile = await getSupabaseProfile(supabase, profileId);
    const [{ data: walletRow }, { data: listingRows }, { data: rentalRows }, { data: conversationRows }, { data: messageRows }, { data: notificationRows }, { data: transactionRows }] = await Promise.all([
      supabase.from('wallets').select('*').eq('profile_id', profile.id).single(),
      supabase.from('listings').select('*').neq('availability', 'maintenance'),
      supabase.from('rentals').select('*'),
      supabase.from('conversations').select('*'),
      supabase.from('messages').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('transactions').select('*').eq('profile_id', profile.id)
    ]);

    const scopedConversationRows = (conversationRows ?? []).filter((conversation) => {
      if (conversation.profile_id) {
        return conversation.profile_id === profile.id;
      }
      return false;
    });

    const conversationParticipantIds = [...new Set(scopedConversationRows.map((conversation) => conversation.participant_id).filter(Boolean))];
    const { data: participantRows } = conversationParticipantIds.length > 0
      ? await supabase.from('profiles').select('id, username, avatar_url').in('id', conversationParticipantIds)
      : { data: [] as any[] };
    const participantById = new Map((participantRows ?? []).map((participant) => [participant.id, participant]));

    const listingById = new Map((listingRows ?? []).map((listing) => [listing.id, listing]));
    const rentalsByPair = new Map<string, any[]>();
    for (const rental of rentalRows ?? []) {
      const matchesCurrentProfile = rental.renter_id === profile.id || rental.owner_id === profile.id;
      if (!matchesCurrentProfile) {
        continue;
      }
      const counterpartyId = rental.renter_id === profile.id ? rental.owner_id : rental.renter_id;
      const key = `${counterpartyId}:${rental.listing_id ?? ''}`;
      const current = rentalsByPair.get(key) ?? [];
      current.push(rental);
      rentalsByPair.set(key, current);
    }

    const conversationGroups = new Map<string, any[]>();
    for (const conversation of scopedConversationRows) {
      const key = conversation.participant_id || conversation.id;
      const current = conversationGroups.get(key) ?? [];
      current.push(conversation);
      conversationGroups.set(key, current);
    }

    const conversations = [...conversationGroups.values()].map((group) => {
      const conversationIds = new Set(group.map((conversation) => conversation.id));
      const mergedMessages = (messageRows ?? [])
        .filter((message) => conversationIds.has(message.conversation_id))
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

      const canonicalConversation = [...group].sort((left, right) => {
        const leftMessageAt = mergedMessages.filter((message) => message.conversation_id === left.id).at(-1)?.timestamp;
        const rightMessageAt = mergedMessages.filter((message) => message.conversation_id === right.id).at(-1)?.timestamp;
        return new Date(rightMessageAt || 0).getTime() - new Date(leftMessageAt || 0).getTime();
      })[0] ?? group[0];

      const participant = participantById.get(canonicalConversation.participant_id);
      const contextListing = listingById.get(canonicalConversation.related_item_id);
      const pairRentals = rentalsByPair.get(`${canonicalConversation.participant_id}:${canonicalConversation.related_item_id ?? ''}`) ?? [];
      const contextRental = [...pairRentals].sort((left, right) =>
        new Date(right.created_at || right.start_date || 0).getTime() - new Date(left.created_at || left.start_date || 0).getTime()
      )[0];

      return {
        id: canonicalConversation.id,
        participantId: canonicalConversation.participant_id,
        participantName: participant?.username || canonicalConversation.participant_name,
        participantAvatar: participant?.avatar_url || canonicalConversation.participant_avatar,
        participantRole: canonicalConversation.participant_role,
        relatedItemId: contextListing?.id ?? canonicalConversation.related_item_id ?? undefined,
        relatedItemTitle: contextListing?.title ?? canonicalConversation.related_item_title ?? undefined,
        contextListingId: contextListing?.id ?? canonicalConversation.related_item_id ?? undefined,
        contextListingTitle: contextListing?.title ?? canonicalConversation.related_item_title ?? undefined,
        contextListingThumbnail: contextListing?.image_url ?? undefined,
        contextRentalId: contextRental?.id ?? undefined,
        contextRentalStatus: contextRental?.status ?? undefined,
        lastMessage: mergedMessages.at(-1)?.text || canonicalConversation.last_message,
        lastMessageDate: canonicalConversation.last_message_date,
        unreadCount: group.reduce((sum, conversation) => sum + (conversation.unread_count ?? 0), 0),
        messages: mergedMessages.map((message) => ({
          id: message.id,
          senderId: message.sender_id,
          text: message.text,
          timestamp: message.timestamp,
          isRead: message.is_read
        }))
      };
    }).sort((left, right) => {
      const leftAt = left.messages.at(-1)?.timestamp || left.lastMessageDate || '';
      const rightAt = right.messages.at(-1)?.timestamp || right.lastMessageDate || '';
      return new Date(rightAt || 0).getTime() - new Date(leftAt || 0).getTime();
    });

    let wallet = walletRow ? mapWalletRow(walletRow) : await buildRealWalletSnapshot(profile.walletAddress);
    if (isLegacyMockWallet(wallet) && (transactionRows?.length ?? 0) === 0) {
      wallet = await buildRealWalletSnapshot(profile.walletAddress);
      await supabase.from('wallets').upsert({
        address: wallet.address,
        profile_id: profile.id,
        sol_balance: wallet.solBalance,
        usdc_balance: wallet.usdcBalance,
        vrnt_balance: wallet.vrntBalance,
        staked_vrnt_balance: wallet.stakedVrntBalance,
        pending_yield_usdc: wallet.pendingYieldUsdc,
        updated_at: wallet.updatedAt
      });
    } else if (wallet.address) {
      const chainWallet = await buildRealWalletSnapshot(wallet.address, wallet);
      if (
        wallet.solBalance !== chainWallet.solBalance
        || wallet.usdcBalance !== chainWallet.usdcBalance
        || wallet.vrntBalance !== chainWallet.vrntBalance
        || wallet.stakedVrntBalance !== chainWallet.stakedVrntBalance
        || wallet.claimableVrnt !== chainWallet.claimableVrnt
        || wallet.pendingUnstakeVrnt !== chainWallet.pendingUnstakeVrnt
        || wallet.unstakeAvailableAt !== chainWallet.unstakeAvailableAt
      ) {
        wallet = chainWallet;
        await supabase.from('wallets').update({
          sol_balance: wallet.solBalance,
          usdc_balance: wallet.usdcBalance,
          vrnt_balance: wallet.vrntBalance,
          staked_vrnt_balance: wallet.stakedVrntBalance,
          updated_at: wallet.updatedAt
        }).eq('profile_id', profile.id);
      }
    }

    const derivedTier = wallet.stakedVrntBalance >= 10000 ? 3 : wallet.stakedVrntBalance >= 5000 ? 2 : 1;
    if (profile.tier !== derivedTier) {
      await supabase.from('profiles').update({ tier: derivedTier }).eq('id', profile.id);
      profile = { ...profile, tier: derivedTier };
    }

    return {
      profile,
      wallet,
      listings: (listingRows ?? []).map(mapListingRow),
      myListings: (listingRows ?? []).filter((item) => item.owner_id === profile.id).map(mapListingRow),
      rentingRentals: (rentalRows ?? []).filter((item) => item.renter_id === profile.id).map(mapRentalRow),
      lendingRentals: (rentalRows ?? []).filter((item) => item.owner_id === profile.id).map(mapRentalRow),
      conversations,
      notifications: (notificationRows ?? [])
        .filter((item) => !item.profile_id || item.profile_id === profile.id)
        .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        timestamp: item.timestamp,
        isRead: item.is_read,
        link: item.link ?? undefined
        })),
      transactions: (transactionRows ?? []).map(mapTransactionRow),
      devices: seedDevices
    };
  }

  const data = await loadData();
  let profile = data.profiles.find((item) => item.id === profileId) ?? buildDashboard('usr_123').profile;
  const storedWallet = data.wallets.find((item) => item.address === profile.walletAddress);
  let wallet = storedWallet ?? await buildRealWalletSnapshot(profile.walletAddress);
  if (isLegacyMockWallet(wallet) && !data.transactions.some((item) => item.profileId === profile.id)) {
    wallet = await buildRealWalletSnapshot(profile.walletAddress);
    const walletIndex = data.wallets.findIndex((item) => item.address === profile.walletAddress);
    if (walletIndex !== -1) {
      data.wallets[walletIndex] = wallet;
    } else {
      data.wallets.push(wallet);
    }
    await saveData(data);
  } else if (storedWallet) {
    const chainWallet = await buildRealWalletSnapshot(storedWallet.address, storedWallet);
    if (
      storedWallet.solBalance !== chainWallet.solBalance
      || storedWallet.usdcBalance !== chainWallet.usdcBalance
      || storedWallet.vrntBalance !== chainWallet.vrntBalance
      || storedWallet.stakedVrntBalance !== chainWallet.stakedVrntBalance
      || storedWallet.claimableVrnt !== chainWallet.claimableVrnt
      || storedWallet.pendingUnstakeVrnt !== chainWallet.pendingUnstakeVrnt
      || storedWallet.unstakeAvailableAt !== chainWallet.unstakeAvailableAt
    ) {
      wallet = chainWallet;
      const walletIndex = data.wallets.findIndex((item) => item.address === storedWallet.address);
      if (walletIndex !== -1) {
        data.wallets[walletIndex] = wallet;
        await saveData(data);
      }
    }
  }

  const derivedTier = wallet.stakedVrntBalance >= 10000 ? 3 : wallet.stakedVrntBalance >= 5000 ? 2 : 1;
  if (profile.tier !== derivedTier) {
    const profileIndex = data.profiles.findIndex((item) => item.id === profile.id);
    if (profileIndex !== -1) {
      data.profiles[profileIndex] = {
        ...data.profiles[profileIndex],
        tier: derivedTier
      };
      profile = data.profiles[profileIndex];
      await saveData(data);
    }
  }
  const participantById = new Map(data.profiles.map((item) => [item.id, item]));
  const conversationsByParticipant = new Map<string, ConversationRecord[]>();
  for (const conversation of data.conversations) {
    const key = conversation.participantId || conversation.id;
    const current = conversationsByParticipant.get(key) ?? [];
    current.push(conversation);
    conversationsByParticipant.set(key, current);
  }

  return {
    profile,
    wallet,
    listings: data.listings.filter((item) => item.availability !== 'maintenance'),
    myListings: data.listings.filter((item) => item.ownerId === profile.id),
    rentingRentals: data.rentals.filter((item) => item.renterId === profile.id),
    lendingRentals: data.rentals.filter((item) => item.ownerId === profile.id),
    conversations: [...conversationsByParticipant.values()].map((group) => {
      const canonicalConversation = group.at(-1) ?? group[0];
      const participant = participantById.get(canonicalConversation.participantId);
      const relatedListing = data.listings.find((item) => item.id === canonicalConversation.relatedItemId);
      const relatedRental = data.rentals
        .filter((item) => item.listingId === canonicalConversation.relatedItemId)
        .sort((left, right) => new Date(right.createdAt || right.startDate || 0).getTime() - new Date(left.createdAt || left.startDate || 0).getTime())[0];
      return {
        ...canonicalConversation,
        participantName: participant?.username || canonicalConversation.participantName,
        participantAvatar: participant?.avatarUrl || canonicalConversation.participantAvatar,
        contextListingId: relatedListing?.id ?? canonicalConversation.relatedItemId,
        contextListingTitle: relatedListing?.title ?? canonicalConversation.relatedItemTitle,
        contextListingThumbnail: relatedListing?.imageUrl,
        contextRentalId: relatedRental?.id,
        contextRentalStatus: relatedRental?.status,
        unreadCount: group.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
        messages: group.flatMap((conversation) => conversation.messages).sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      };
    }).sort((left, right) => {
      const leftAt = left.messages.at(-1)?.timestamp || left.lastMessageDate || '';
      const rightAt = right.messages.at(-1)?.timestamp || right.lastMessageDate || '';
      return new Date(rightAt || 0).getTime() - new Date(leftAt || 0).getTime();
    }),
    notifications: data.notifications,
    transactions: data.transactions.filter((item) => item.profileId === profile.id),
    devices: data.devices
  };
}

export async function createListing(profileId: string, payload: CreateListingRequest) {
  const supabase = getSupabase();
  if (supabase) {
    const profile = await getSupabaseProfile(supabase, profileId);
    const listingId = payload.id || `lst_${crypto.randomUUID().slice(0, 8)}`;
    const imageUrl = await resolveListingImageUrl(supabase, listingId, profile.id, payload.imageUrl);
    const listing = attachListingProtocolMetadata({
      id: listingId,
      ownerId: profile.id,
      ownerWalletAddress: profile.walletAddress,
      ownerName: profile.username || 'You',
      ownerAvatar: profile.avatarUrl,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      productType: payload.productType?.trim() || undefined,
      specs: payload.specs,
      location: payload.location,
      dailyRateUsdc: payload.dailyRateUsdc,
      collateralValueUsdc: payload.dailyRateUsdc * 50,
      imageUrl,
      availability: 'active',
      createdAt: new Date().toISOString(),
      confirmedSignature: payload.transactionHash,
      confirmedSlot: payload.confirmedSlot
    }, profile.walletAddress);
    const row = {
      id: listing.id,
      owner_id: listing.ownerId,
      owner_wallet_address: listing.ownerWalletAddress,
      owner_name: listing.ownerName,
      owner_avatar: listing.ownerAvatar,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      product_type: listing.productType,
      specs: listing.specs,
      location: listing.location,
      daily_rate_usdc: listing.dailyRateUsdc,
      collateral_value_usdc: listing.collateralValueUsdc,
      image_url: listing.imageUrl,
      availability: listing.availability,
      created_at: listing.createdAt,
      program_id: listing.programId,
      listing_pda: listing.listingPda,
      settlement_mint: listing.settlementMint,
      chain_cluster: listing.chainCluster,
      protocol_version: listing.protocolVersion,
      confirmed_signature: listing.confirmedSignature,
      confirmed_slot: listing.confirmedSlot
    };
    await supabase.from('listings').insert(row);
    return listing;
  }

  const data = await loadData();
  const profile = data.profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const listingId = payload.id || `lst_${crypto.randomUUID().slice(0, 8)}`;
  const listing = attachListingProtocolMetadata({
    id: listingId,
    ownerId: profile.id,
    ownerWalletAddress: profile.walletAddress,
    ownerName: profile.username || 'You',
    ownerAvatar: profile.avatarUrl,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    productType: payload.productType?.trim() || undefined,
    specs: payload.specs,
    location: payload.location,
    dailyRateUsdc: payload.dailyRateUsdc,
    collateralValueUsdc: payload.dailyRateUsdc * 50,
    imageUrl: await resolveListingImageUrl(null, listingId, profile.id, payload.imageUrl),
    availability: 'active' as const,
    createdAt: new Date().toISOString(),
    confirmedSignature: payload.transactionHash,
    confirmedSlot: payload.confirmedSlot
  }, profile.walletAddress);

  data.listings.unshift(listing);
  await saveData(data);
  return listing;
}

export async function updateListing(listingId: string, patch: Partial<ListingRecord>) {
  const supabase = getSupabase();
  if (supabase) {
    const updateRow: Record<string, unknown> = {};
    if (patch.title !== undefined) updateRow.title = patch.title;
    if (patch.description !== undefined) updateRow.description = patch.description;
    if (patch.category !== undefined) updateRow.category = patch.category;
    if (patch.productType !== undefined) updateRow.product_type = patch.productType;
    if (patch.specs !== undefined) updateRow.specs = patch.specs;
    if (patch.location !== undefined) updateRow.location = patch.location;
    if (patch.dailyRateUsdc !== undefined) updateRow.daily_rate_usdc = patch.dailyRateUsdc;
    if (patch.collateralValueUsdc !== undefined) updateRow.collateral_value_usdc = patch.collateralValueUsdc;
    if (patch.confirmedSignature !== undefined) updateRow.confirmed_signature = patch.confirmedSignature;
    if (patch.confirmedSlot !== undefined) updateRow.confirmed_slot = patch.confirmedSlot;
    const { data } = await supabase.from('listings').update(updateRow).eq('id', listingId).select('*').single();
    if (!data) {
      throw new Error('Listing not found');
    }
    return mapListingRow(data);
  }

  const data = await loadData();
  const listingIndex = data.listings.findIndex((item) => item.id === listingId);
  if (listingIndex === -1) {
    throw new Error('Listing not found');
  }
  data.listings[listingIndex] = { ...data.listings[listingIndex], ...patch };
  await saveData(data);
  return data.listings[listingIndex];
}

export async function createRental(rental: RentalRecord) {
  const supabase = getSupabase();
  if (supabase) {
    const row = {
      id: rental.id,
      listing_id: rental.listingId,
      item_title: rental.itemTitle,
      renter_id: rental.renterId,
      owner_id: rental.ownerId,
      renter_wallet_address: rental.renterWalletAddress,
      owner_wallet_address: rental.ownerWalletAddress,
      start_date: rental.startDate,
      end_date: rental.endDate,
      total_cost: rental.totalCost,
      collateral_locked: rental.collateralLocked,
      status: rental.status,
      thumbnail: rental.thumbnail,
      transaction_hash: rental.transactionHash,
      explorer_url: rental.explorerUrl,
      pickup_code: rental.pickupCode,
      return_code: rental.returnCode,
      created_at: rental.createdAt,
      program_id: rental.programId,
      rental_escrow_pda: rental.rentalEscrowPda,
      payment_vault: rental.paymentVault,
      collateral_vault: rental.collateralVault,
      settlement_mint: rental.settlementMint,
      treasury_usdc_account: rental.treasuryUsdcAccount,
      status_reason: rental.statusReason,
      confirmed_signature: rental.confirmedSignature,
      confirmed_slot: rental.confirmedSlot,
      chain_cluster: rental.chainCluster,
      protocol_version: rental.protocolVersion
    };
    await supabase.from('rentals').insert(row);
    return rental;
  }

  const data = await loadData();
  data.rentals.unshift(rental);
  await saveData(data);
  return rental;
}

export async function updateRental(rentalId: string, patch: Partial<RentalRecord>) {
  const supabase = getSupabase();
  if (supabase) {
    const updateRow: Record<string, unknown> = {};
    if (patch.status) updateRow.status = patch.status;
    if (patch.transactionHash) updateRow.transaction_hash = patch.transactionHash;
    if (patch.explorerUrl) updateRow.explorer_url = patch.explorerUrl;
    if (patch.pickupCode) updateRow.pickup_code = patch.pickupCode;
    if (patch.returnCode) updateRow.return_code = patch.returnCode;
    if (patch.statusReason) updateRow.status_reason = patch.statusReason;
    if (patch.confirmedSignature) updateRow.confirmed_signature = patch.confirmedSignature;
    if (patch.confirmedSlot !== undefined) updateRow.confirmed_slot = patch.confirmedSlot;
    const { data } = await supabase.from('rentals').update(updateRow).eq('id', rentalId).select('*').single();
    if (!data) {
      throw new Error('Rental not found');
    }
    return mapRentalRow(data);
  }

  const data = await loadData();
  const rentalIndex = data.rentals.findIndex((item) => item.id === rentalId);
  if (rentalIndex === -1) {
    throw new Error('Rental not found');
  }
  data.rentals[rentalIndex] = { ...data.rentals[rentalIndex], ...patch };
  await saveData(data);
  return data.rentals[rentalIndex];
}

export async function createTransaction(record: TransactionRecord) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('transactions').insert({
      id: record.id,
      profile_id: record.profileId,
      type: record.type,
      amount: record.amount,
      currency: record.currency,
      date: record.date,
      status: record.status,
      hash: record.hash,
      explorer_url: record.explorerUrl
    });
    return record;
  }

  const data = await loadData();
  data.transactions.unshift(record);
  await saveData(data);
  return record;
}

export async function updateWalletBalance(profileId: string, patch: Partial<WalletSnapshot>) {
  const data = await loadData();
  const profile = data.profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }
  const walletIndex = data.wallets.findIndex((item) => item.address === profile.walletAddress);
  if (walletIndex === -1) {
    throw new Error('Wallet not found');
  }
  data.wallets[walletIndex] = {
    ...data.wallets[walletIndex],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await saveData(data);
  return data.wallets[walletIndex];
}

export async function createOrOpenConversation(profileId: string, listingId: string) {
  const supabase = getSupabase();
  if (supabase) {
    const profile = await getSupabaseProfile(supabase, profileId);
    const { data: listingRow } = await supabase.from('listings').select('*').eq('id', listingId).single();
    if (!listingRow) {
      throw new Error('Listing not found');
    }
    if (listingRow.owner_id === profileId) {
      throw new Error('Owners cannot start a conversation with themselves');
    }

    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('profile_id', profileId)
      .eq('participant_id', listingRow.owner_id)
      .order('id');
    const existingConversation = existingConversations?.[0];
    if (existingConversation) {
      await supabase.from('conversations').update({
        related_item_id: listingId,
        related_item_title: listingRow.title
      }).eq('id', existingConversation.id);

      const { data: counterpartRows } = await supabase
        .from('conversations')
        .select('*')
        .eq('profile_id', listingRow.owner_id)
        .eq('participant_id', profile.id)
        .order('id');
      const counterpartRow = counterpartRows?.[0];
      if (counterpartRow) {
        await supabase.from('conversations').update({
          related_item_id: listingId,
          related_item_title: listingRow.title
        }).eq('id', counterpartRow.id);
      }

      const dashboard = await getDashboard(profileId);
      const conversation = dashboard.conversations.find((item) => item.participantId === listingRow.owner_id);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      return conversation;
    }

    const { data: ownerRow } = await supabase.from('profiles').select('*').eq('id', listingRow.owner_id).single();
    if (!ownerRow) {
      throw new Error('Listing owner not found');
    }

    const requesterConversationId = `conv_${crypto.randomUUID().slice(0, 8)}`;
    const ownerConversationId = `conv_${crypto.randomUUID().slice(0, 8)}`;
    await supabase.from('conversations').insert([
      {
        id: requesterConversationId,
        profile_id: profileId,
        participant_id: ownerRow.id,
        participant_name: listingRow.owner_name,
        participant_avatar: listingRow.owner_avatar,
        participant_role: 'Owner',
        related_item_id: listingId,
        related_item_title: listingRow.title,
        last_message: '',
        last_message_date: '',
        unread_count: 0
      },
      {
        id: ownerConversationId,
        profile_id: ownerRow.id,
        participant_id: profile.id,
        participant_name: profile.username,
        participant_avatar: profile.avatarUrl,
        participant_role: 'Renter',
        related_item_id: listingId,
        related_item_title: listingRow.title,
        last_message: '',
        last_message_date: '',
        unread_count: 0
      }
    ]);

    const dashboard = await getDashboard(profileId);
    const conversation = dashboard.conversations.find((item) => item.id === requesterConversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
  }

  const data = await loadData();
  const listing = data.listings.find((item) => item.id === listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }
  if (listing.ownerId === profileId) {
    throw new Error('Owners cannot start a conversation with themselves');
  }

  const existingConversation = data.conversations.find((item) => item.participantId === listing.ownerId);
  if (existingConversation) {
    existingConversation.relatedItemId = listingId;
    existingConversation.relatedItemTitle = listing.title;
    await saveData(data);
    return existingConversation;
  }

  const conversation = {
    id: `conv_${crypto.randomUUID().slice(0, 8)}`,
    participantId: listing.ownerId,
    participantName: listing.ownerName,
    participantAvatar: listing.ownerAvatar,
    participantRole: 'Owner' as const,
    relatedItemId: listingId,
    relatedItemTitle: listing.title,
    lastMessage: '',
    lastMessageDate: '',
    unreadCount: 0,
    messages: []
  };
  data.conversations.unshift(conversation);
  await saveData(data);
  return conversation;
}

export async function addMessage(conversationId: string, senderId: string, text: string) {
  const supabase = getSupabase();
  if (supabase) {
    const { data: conversationRow } = await supabase.from('conversations').select('*').eq('id', conversationId).single();
    if (!conversationRow) {
      throw new Error('Conversation not found');
    }

    const timestamp = new Date().toISOString();
    const messageRows = [
      {
        id: `msg_${crypto.randomUUID().slice(0, 8)}`,
        conversation_id: conversationId,
        sender_id: senderId,
        text,
        timestamp,
        is_read: false
      }
    ];
    const { data: counterpartRows } = await supabase
      .from('conversations')
      .select('*')
      .eq('profile_id', conversationRow.participant_id)
      .eq('participant_id', senderId)
      .order('id');
    const counterpartRow = counterpartRows?.[0];
    if (counterpartRow) {
      messageRows.push({
        id: `msg_${crypto.randomUUID().slice(0, 8)}`,
        conversation_id: counterpartRow.id,
        sender_id: senderId,
        text,
        timestamp,
        is_read: false
      });
    }

    await supabase.from('messages').insert(messageRows);
    await supabase.from('conversations').update({
      last_message: text,
      last_message_date: 'Just now',
      unread_count: 0
    }).eq('id', conversationId);
    if (counterpartRow) {
      await supabase.from('conversations').update({
        last_message: text,
        last_message_date: 'Just now',
        unread_count: (counterpartRow.unread_count ?? 0) + 1
      }).eq('id', counterpartRow.id);
      await supabase.from('notifications').insert({
        id: `not_${crypto.randomUUID().slice(0, 8)}`,
        profile_id: counterpartRow.profile_id,
        type: 'rental',
        title: 'New Message',
        message: text,
        timestamp: 'Just now',
        is_read: false,
        link: '/messages'
      });
    }

    const dashboard = await getDashboard(senderId);
    const conversation = dashboard.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
  }

  const data = await loadData();
  const conversation = data.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  conversation.messages.push({
    id: `msg_${crypto.randomUUID().slice(0, 8)}`,
    senderId,
    text,
    timestamp: new Date().toISOString(),
    isRead: false
  });
  conversation.lastMessage = text;
  conversation.lastMessageDate = 'Just now';
  await saveData(data);
  return conversation;
}

export async function markNotificationsRead(profileId: string) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', profileId);
    const { data } = await supabase.from('notifications').select('*').eq('profile_id', profileId);
    return (data ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      timestamp: item.timestamp,
      isRead: item.is_read,
      link: item.link ?? undefined
    }));
  }

  const data = await loadData();
  data.notifications = data.notifications.map((item) => ({ ...item, isRead: true }));
  await saveData(data);
  return data.notifications;
}

export async function updateSettings(profileId: string, payload: SettingsUpdateRequest) {
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.from('profiles').update({
      username: payload.username,
      bio: payload.bio,
      notify_rentals: payload.notifications.rentals,
      notify_marketing: payload.notifications.marketing,
      notify_security: payload.notifications.security
    }).eq('id', profileId).select('*').single();
    if (!data) {
      throw new Error('Profile not found');
    }
    return mapProfileRow(data);
  }

  const data = await loadData();
  const profileIndex = data.profiles.findIndex((item) => item.id === profileId);
  if (profileIndex === -1) {
    throw new Error('Profile not found');
  }
  data.profiles[profileIndex] = {
    ...data.profiles[profileIndex],
    username: payload.username,
    bio: payload.bio,
    notificationPreferences: {
      rentals: payload.notifications.rentals,
      marketing: payload.notifications.marketing,
      security: payload.notifications.security
    }
  };
  await saveData(data);
  return data.profiles[profileIndex];
}

export async function applyWithdrawal(profileId: string, payload: WithdrawRequest, hash: string, explorerUrl: string) {
  const supabase = getSupabase();
  if (supabase) {
    const profile = await getSupabaseProfile(supabase, profileId);
    const { data: walletRow } = await supabase.from('wallets').select('*').eq('profile_id', profile.id).single();
    if (!walletRow) {
      throw new Error('Wallet not found');
    }
    const wallet = mapWalletRow(walletRow);
    if (payload.currency === 'SOL') wallet.solBalance = Math.max(0, wallet.solBalance - payload.amount);
    if (payload.currency === 'USDC') wallet.usdcBalance = Math.max(0, wallet.usdcBalance - payload.amount);
    if (payload.currency === 'VRNT') wallet.vrntBalance = Math.max(0, wallet.vrntBalance - payload.amount);
    wallet.updatedAt = new Date().toISOString();

    await supabase.from('wallets').update({
      sol_balance: wallet.solBalance,
      usdc_balance: wallet.usdcBalance,
      vrnt_balance: wallet.vrntBalance,
      staked_vrnt_balance: wallet.stakedVrntBalance,
      pending_yield_usdc: wallet.pendingYieldUsdc,
      updated_at: wallet.updatedAt
    }).eq('profile_id', profileId);

    await supabase.from('transactions').insert({
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
      profile_id: profileId,
      type: 'withdraw',
      amount: payload.amount,
      currency: payload.currency,
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      hash,
      explorer_url: explorerUrl
    });
    return wallet;
  }

  const data = await loadData();
  const profile = data.profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }
  const walletIndex = data.wallets.findIndex((item) => item.address === profile.walletAddress);
  const wallet = data.wallets[walletIndex];
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const nextWallet = { ...wallet };
  if (payload.currency === 'SOL') {
    nextWallet.solBalance = Math.max(0, nextWallet.solBalance - payload.amount);
  }
  if (payload.currency === 'USDC') {
    nextWallet.usdcBalance = Math.max(0, nextWallet.usdcBalance - payload.amount);
  }
  if (payload.currency === 'VRNT') {
    nextWallet.vrntBalance = Math.max(0, nextWallet.vrntBalance - payload.amount);
  }
  nextWallet.updatedAt = new Date().toISOString();
  data.wallets[walletIndex] = nextWallet;

  data.transactions.unshift({
    id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    profileId,
    type: 'withdraw',
    amount: payload.amount,
    currency: payload.currency,
    date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    hash,
    explorerUrl
  });

  await saveData(data);
  return nextWallet;
}

export async function applyStake(profileId: string, payload: StakeRequest, hash: string, explorerUrl: string) {
  const amount = payload.amount ?? 0;
  const transactionType = payload.action === 'claim_rewards'
    ? 'claim_rewards'
    : payload.action === 'stake'
      ? 'stake'
      : payload.action;
  const supabase = getSupabase();
  if (supabase) {
    const profile = await getSupabaseProfile(supabase, profileId);
    const { data: walletRow } = await supabase.from('wallets').select('*').eq('profile_id', profile.id).single();
    if (!walletRow) {
      throw new Error('Wallet not found');
    }
    const wallet = mapWalletRow(walletRow);
    if (payload.action === 'stake') {
      wallet.vrntBalance = Math.max(0, wallet.vrntBalance - amount);
      wallet.stakedVrntBalance += amount;
    } else if (payload.action === 'finalize_unstake') {
      wallet.vrntBalance += amount;
    }
    wallet.updatedAt = new Date().toISOString();
    const tier = wallet.stakedVrntBalance >= 10000 ? 3 : wallet.stakedVrntBalance >= 5000 ? 2 : 1;

    await supabase.from('wallets').update({
      sol_balance: wallet.solBalance,
      usdc_balance: wallet.usdcBalance,
      vrnt_balance: wallet.vrntBalance,
      staked_vrnt_balance: wallet.stakedVrntBalance,
      pending_yield_usdc: wallet.pendingYieldUsdc,
      updated_at: wallet.updatedAt
    }).eq('profile_id', profileId);

    await supabase.from('profiles').update({ tier }).eq('id', profileId);
    await supabase.from('transactions').insert({
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
      profile_id: profileId,
      type: transactionType,
      amount,
      currency: 'VRNT',
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      hash,
      explorer_url: explorerUrl
    });

    return {
      wallet,
      profile: {
        ...profile,
        tier
      }
    };
  }

  const data = await loadData();
  const profile = data.profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }
  const walletIndex = data.wallets.findIndex((item) => item.address === profile.walletAddress);
  const wallet = data.wallets[walletIndex];
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (payload.action === 'stake') {
    wallet.vrntBalance = Math.max(0, wallet.vrntBalance - amount);
    wallet.stakedVrntBalance += amount;
  } else if (payload.action === 'finalize_unstake') {
    wallet.vrntBalance += amount;
  }
  wallet.updatedAt = new Date().toISOString();

  const tier = wallet.stakedVrntBalance >= 10000 ? 3 : wallet.stakedVrntBalance >= 5000 ? 2 : 1;
  const profileIndex = data.profiles.findIndex((item) => item.id === profileId);
  data.profiles[profileIndex] = {
    ...data.profiles[profileIndex],
    tier
  };

  data.transactions.unshift({
    id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    profileId,
    type: transactionType,
    amount,
    currency: 'VRNT',
    date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    hash,
    explorerUrl
  });

  await saveData(data);
  return {
    wallet,
    profile: data.profiles[profileIndex]
  };
}
