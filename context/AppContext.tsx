import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { Connection, PublicKey, SystemProgram, Transaction as SolanaTransaction, TransactionInstruction } from '@solana/web3.js';
import type {
  CreateListingRequest,
  DashboardPayload,
  Profile,
  RentalVerificationRequest,
  StakeRequest,
  SettingsUpdateRequest,
  UpdateListingRequest
} from '../shared/contracts';
import { buildAcceptRentalInstruction, buildClaimRewardsInstruction, buildCompleteRentalInstruction, buildConfirmPickupInstruction, buildConfirmReturnInstruction, buildCreateRentalEscrowInstructions, buildFinalizeUnstakeInstruction, buildRegisterListingInstruction, buildRequestUnstakeInstruction, buildStakeInstruction, buildUpdateListingInstruction } from '../shared/protocol-instructions';
import { ASSOCIATED_TOKEN_PROGRAM_ID, buildSolanaExplorerTxUrl, deriveAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '../shared/protocol';
import { acceptRentalApi, analyzeFleetApi, ApiError, bootstrap, clearSessionToken, completeRentalApi, confirmPickupApi, createListingApi, createRentalApi, getQuote, getStoredToken, login, markConversationReadApi, markConversationUnreadApi, markNotificationsReadApi, openConversationApi, sendMessageApi, stakeApi, storeToken, updateListingApi, updateSettingsApi, withdrawApi } from '../services/api';
import type { AIAnalysisResponse, Conversation, Listing, QuoteResponse, Rental, Transaction, WalletState } from '../types';

interface AppContextValue {
  profile: Profile | null;
  wallet: WalletState | null;
  listings: Listing[];
  myListings: Listing[];
  rentingRentals: Rental[];
  lendingRentals: Rental[];
  conversations: Conversation[];
  notifications: DashboardPayload['notifications'];
  transactions: Transaction[];
  devices: DashboardPayload['devices'];
  loading: boolean;
  error: string | null;
  loginWithPrivy: (email: string, role: Profile['role'], privyToken: string, walletAddress?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  createListing: (payload: CreateListingRequest) => Promise<Listing>;
  updateListing: (listingId: string, payload: UpdateListingRequest) => Promise<Listing>;
  requestQuote: (listingId: string, days: number) => Promise<QuoteResponse>;
  createRental: (listingId: string, days: number) => Promise<Rental>;
  acceptRentalById: (rentalId: string) => Promise<Rental>;
  confirmPickupById: (rentalId: string, code: string) => Promise<Rental>;
  completeRentalById: (rentalId: string, code: string) => Promise<Rental>;
  openConversationForListing: (listingId: string) => Promise<Conversation>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  markConversationUnread: (conversationId: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  updateProfileSettings: (payload: SettingsUpdateRequest) => Promise<void>;
  withdraw: (
    recipientAddress: string,
    amount: number,
    currency: 'SOL' | 'USDC' | 'VRNT',
    meta?: { transactionHash?: string; explorerUrl?: string }
  ) => Promise<{ transactionHash: string; explorerUrl: string }>;
  stake: (amount: number | undefined, action: StakeRequest['action']) => Promise<{ transactionHash: string; explorerUrl: string; confirmedSlot?: number }>;
  analyzeFleet: () => Promise<AIAnalysisResponse>;
}

const AppContext = createContext<AppContextValue | null>(null);

function mapRental(rental: DashboardPayload['rentingRentals'][number]): Rental {
  return {
    ...rental,
    itemId: rental.listingId
  };
}

export const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { logout: privyLogout } = usePrivy();
  const { wallets: embeddedWallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [rentingRentals, setRentingRentals] = useState<Rental[]>([]);
  const [lendingRentals, setLendingRentals] = useState<Rental[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<DashboardPayload['notifications']>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<DashboardPayload['devices']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const connection = useMemo(() => new Connection('https://api.devnet.solana.com', 'confirmed'), []);

  const getEmbeddedWallet = () => {
    if (!profile?.walletAddress) {
      throw new Error('Missing active wallet address');
    }
    const embeddedWallet = embeddedWallets.find((wallet) => wallet.address === profile.walletAddress) ?? embeddedWallets[0];
    if (!embeddedWallet) {
      throw new Error('Privy embedded Solana wallet is not available');
    }
    return embeddedWallet;
  };

  const signAndConfirmInstructions = async (instructions: SolanaTransaction['instructions']) => {
    const embeddedWallet = getEmbeddedWallet();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const transaction = new SolanaTransaction({
      feePayer: new PublicKey(embeddedWallet.address),
      recentBlockhash: blockhash
    });

    for (const instruction of instructions) {
      transaction.add(instruction);
    }

    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      const logs = simulation.value.logs ?? [];
      const relevantLog = [...logs].reverse().find((line) => line.toLowerCase().includes('error') || line.toLowerCase().includes('failed'));
      throw new Error(relevantLog ?? JSON.stringify(simulation.value.err));
    }

    const result = await signAndSendTransaction({
      transaction: new Uint8Array(transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })),
      wallet: embeddedWallet,
      chain: 'solana:devnet'
    });

    const signature = bs58.encode(result.signature);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    const confirmation = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true
    });

    return {
      signature,
      explorerUrl: buildSolanaExplorerTxUrl(signature),
      confirmedSlot: confirmation.value?.slot
    };
  };

  const buildCreateAssociatedTokenAccountInstruction = (payer: string, owner: string, mint: string) => {
    const associatedTokenAddress = deriveAssociatedTokenAddress(owner, mint);

    return new TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: new PublicKey(payer), isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(owner), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: Buffer.alloc(0)
    });
  };

  const hydrate = async () => {
    setLoading(true);
    try {
      const data = await bootstrap();
      setProfile(data.profile);
      setWallet(data.wallet);
      setListings(data.listings);
      setMyListings(data.myListings);
      setRentingRentals(data.rentingRentals.map(mapRental));
      setLendingRentals(data.lendingRentals.map(mapRental));
      setConversations(data.conversations);
      setNotifications(data.notifications);
      setTransactions(data.transactions);
      setDevices(data.devices);
      setError(null);
    } catch (caughtError) {
      const isUnauthorized = caughtError instanceof ApiError && caughtError.status === 401;
      if (isUnauthorized) {
        storeToken(null);
        setProfile(null);
        setWallet(null);
        setError(null);
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load app data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getStoredToken()) {
      setError(null);
      setLoading(false);
      return;
    }
    void hydrate();
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    profile,
    wallet,
    listings,
    myListings,
    rentingRentals,
    lendingRentals,
    conversations,
    notifications,
    transactions,
    devices,
    loading,
    error,
    loginWithPrivy: async (email, role, privyToken, walletAddress) => {
      setError(null);
      const session = await login({ email, role, privyToken, walletAddress });
      storeToken(session.accessToken);
      await hydrate();
    },
    logout: () => {
      clearSessionToken();
      setError(null);
      setProfile(null);
      setWallet(null);
      setListings([]);
      setMyListings([]);
      setRentingRentals([]);
      setLendingRentals([]);
      setConversations([]);
      setNotifications([]);
      setTransactions([]);
      void privyLogout();
    },
    refresh: hydrate,
    createListing: async (payload) => {
      if (!profile?.walletAddress) {
        throw new Error('Missing active profile wallet');
      }

      const listingId = payload.id || `lst_${crypto.randomUUID().slice(0, 8)}`;
      const { instruction, listingPda } = await buildRegisterListingInstruction({
        ownerWalletAddress: profile.walletAddress,
        listingId,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        specs: payload.specs,
        dailyRateUsdc: payload.dailyRateUsdc,
        collateralUsdc: payload.dailyRateUsdc * 50
      });
      const chainResult = await signAndConfirmInstructions([instruction]);
      const listing = await createListingApi({
        ...payload,
        id: listingId,
        listingPda: listingPda.toBase58(),
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });
      setMyListings((prev) => [listing, ...prev]);
      setListings((prev) => [listing, ...prev]);
      return listing;
    },
    updateListing: async (listingId, payload) => {
      if (!profile?.walletAddress) {
        throw new Error('Missing active profile wallet');
      }

      const listingToUpdate = myListings.find((item) => item.id === listingId) ?? listings.find((item) => item.id === listingId);
      if (!listingToUpdate?.listingPda) {
        throw new Error('Listing is missing on-chain metadata');
      }

      const instruction = await buildUpdateListingInstruction({
        ownerWalletAddress: profile.walletAddress,
        listingPda: listingToUpdate.listingPda,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        specs: payload.specs,
        dailyRateUsdc: payload.dailyRateUsdc,
        collateralUsdc: payload.dailyRateUsdc * 50,
        programId: listingToUpdate.programId
      });
      const chainResult = await signAndConfirmInstructions([instruction]);
      const updatedListing = await updateListingApi(listingId, {
        ...payload,
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });

      setMyListings((prev) => prev.map((item) => (item.id === listingId ? updatedListing : item)));
      setListings((prev) => prev.map((item) => (item.id === listingId ? updatedListing : item)));
      return updatedListing;
    },
    requestQuote: (listingId, days) => getQuote(listingId, days),
    createRental: async (listingId, days) => {
      if (!profile) {
        throw new Error('Missing active profile');
      }
      const listing = listings.find((item) => item.id === listingId);
      if (!listing?.listingPda || !listing.settlementMint || !listing.ownerWalletAddress || !profile.walletAddress) {
        throw new Error('Listing is missing on-chain protocol metadata');
      }
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const quote = await getQuote(listingId, days);
      const rentalId = `rnt_${crypto.randomUUID().slice(0, 8)}`;
      const rentalInstructions = await buildCreateRentalEscrowInstructions({
        listingPda: listing.listingPda,
        ownerWalletAddress: listing.ownerWalletAddress,
        renterWalletAddress: profile.walletAddress,
        rentalId,
        settlementMint: listing.settlementMint,
        startDate,
        endDate,
        rentalAmountUsdc: quote.rentalTotal,
        collateralAmountUsdc: quote.requiredCollateral
      });
      const chainResult = await signAndConfirmInstructions(rentalInstructions.instructions);
      const response = await createRentalApi({
        id: rentalId,
        listingId,
        days,
        renterId: profile.id,
        startDate,
        endDate,
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot,
        rentalEscrowPda: rentalInstructions.rentalEscrowPda.toBase58(),
        paymentVault: rentalInstructions.paymentVault.toBase58(),
        collateralVault: rentalInstructions.collateralVault.toBase58()
      });
      const nextRental = mapRental(response.rental);
      setRentingRentals((prev) => [nextRental, ...prev]);
      await hydrate();
      return nextRental;
    },
    acceptRentalById: async (rentalId) => {
      if (!profile?.walletAddress) {
        throw new Error('Missing active profile wallet');
      }
      const rentalToAccept = lendingRentals.find((item) => item.id === rentalId);
      if (!rentalToAccept?.rentalEscrowPda) {
        throw new Error('Rental escrow PDA is missing');
      }
      const instruction = await buildAcceptRentalInstruction({
        ownerWalletAddress: profile.walletAddress,
        rentalEscrowPda: rentalToAccept.rentalEscrowPda,
        programId: rentalToAccept.programId
      });
      const chainResult = await signAndConfirmInstructions([instruction]);
      const rental = await acceptRentalApi(rentalId, {
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });
      const nextRental = mapRental(rental);
      setLendingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      setRentingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      return nextRental;
    },
    confirmPickupById: async (rentalId, code) => {
      if (!profile?.walletAddress) {
        throw new Error('Missing active profile wallet');
      }
      const rentalToConfirm = lendingRentals.find((item) => item.id === rentalId);
      if (!rentalToConfirm?.rentalEscrowPda) {
        throw new Error('Rental escrow PDA is missing');
      }
      if (!rentalToConfirm.pickupCode || rentalToConfirm.pickupCode.trim().toUpperCase() !== code.trim().toUpperCase()) {
        throw new Error('Pickup code does not match this rental.');
      }

      const instruction = await buildConfirmPickupInstruction({
        ownerWalletAddress: profile.walletAddress,
        rentalEscrowPda: rentalToConfirm.rentalEscrowPda,
        pickupCode: code,
        programId: rentalToConfirm.programId
      });
      const chainResult = await signAndConfirmInstructions([instruction]);
      const rental = await confirmPickupApi(rentalId, {
        code,
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });
      const nextRental = mapRental(rental);
      setLendingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      setRentingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      return nextRental;
    },
    completeRentalById: async (rentalId, code) => {
      if (!profile?.walletAddress) {
        throw new Error('Missing active profile wallet');
      }
      const rentalToComplete = lendingRentals.find((item) => item.id === rentalId);
      if (!rentalToComplete?.rentalEscrowPda || !rentalToComplete.paymentVault || !rentalToComplete.collateralVault || !rentalToComplete.renterWalletAddress || !rentalToComplete.settlementMint || !rentalToComplete.treasuryUsdcAccount) {
        throw new Error('Rental is missing protocol accounts needed for completion');
      }
      if (!rentalToComplete.returnCode || rentalToComplete.returnCode.trim().toUpperCase() !== code.trim().toUpperCase()) {
        throw new Error('Return code does not match this rental.');
      }

      const confirmReturnInstruction = await buildConfirmReturnInstruction({
        ownerWalletAddress: profile.walletAddress,
        rentalEscrowPda: rentalToComplete.rentalEscrowPda,
        returnCode: code,
        programId: rentalToComplete.programId
      });
      const ownerPaymentAccount = deriveAssociatedTokenAddress(profile.walletAddress, rentalToComplete.settlementMint);
      const ownerPaymentAccountInfo = await connection.getAccountInfo(ownerPaymentAccount, 'confirmed');
      const completeInstruction = await buildCompleteRentalInstruction({
        ownerWalletAddress: profile.walletAddress,
        renterWalletAddress: rentalToComplete.renterWalletAddress,
        rentalEscrowPda: rentalToComplete.rentalEscrowPda,
        paymentVault: rentalToComplete.paymentVault,
        collateralVault: rentalToComplete.collateralVault,
        settlementMint: rentalToComplete.settlementMint,
        treasuryUsdcAccount: rentalToComplete.treasuryUsdcAccount,
        programId: rentalToComplete.programId
      });
      const instructions = ownerPaymentAccountInfo
        ? [confirmReturnInstruction, completeInstruction]
        : [
            buildCreateAssociatedTokenAccountInstruction(
              profile.walletAddress,
              profile.walletAddress,
              rentalToComplete.settlementMint
            ),
            confirmReturnInstruction,
            completeInstruction
          ];
      const chainResult = await signAndConfirmInstructions(instructions);
      const rental = await completeRentalApi(rentalId, {
        code,
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });
      const nextRental = mapRental(rental);
      setLendingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      setRentingRentals((prev) => prev.map((item) => (item.id === rentalId ? nextRental : item)));
      return nextRental;
    },
    openConversationForListing: async (listingId) => {
      const conversation = await openConversationApi(listingId);
      setConversations((prev) => {
        const existing = prev.find((item) => item.id === conversation.id);
        if (existing) {
          return prev.map((item) => (item.id === conversation.id ? conversation : item));
        }
        return [conversation, ...prev];
      });
      return conversation;
    },
    sendMessage: async (conversationId, text) => {
      const conversation = await sendMessageApi(conversationId, text);
      setConversations((prev) => prev.map((item) => (item.id === conversationId ? conversation : item)));
    },
    markConversationRead: async (conversationId) => {
      const conversation = await markConversationReadApi(conversationId);
      setConversations((prev) => prev.map((item) => (
        item.id === conversation.id || item.participantId === conversation.participantId
          ? conversation
          : item
      )));
    },
    markConversationUnread: async (conversationId) => {
      const conversation = await markConversationUnreadApi(conversationId);
      setConversations((prev) => prev.map((item) => (
        item.id === conversation.id || item.participantId === conversation.participantId
          ? conversation
          : item
      )));
    },
    markNotificationsRead: async () => {
      const nextNotifications = await markNotificationsReadApi();
      setNotifications(nextNotifications);
    },
    updateProfileSettings: async (payload) => {
      const nextProfile = await updateSettingsApi(payload);
      setProfile(nextProfile);
    },
    withdraw: async (recipientAddress, amount, currency, meta) => {
      if (!profile) {
        throw new Error('Missing active profile');
      }
      const result = await withdrawApi({
        profileId: profile.id,
        recipientAddress,
        amount,
        currency,
        transactionHash: meta?.transactionHash,
        explorerUrl: meta?.explorerUrl
      });
      setWallet(result.wallet);
      await hydrate();
      return {
        transactionHash: result.transactionHash,
        explorerUrl: result.explorerUrl
      };
    },
    stake: async (amount, action) => {
      if (!profile || !wallet?.vrntMint) {
        throw new Error('Missing active profile');
      }
      let instructions: SolanaTransaction['instructions'];

      if (action === 'stake') {
        if (!amount || amount <= 0) {
          throw new Error('Stake amount is required');
        }
        const { instruction } = await buildStakeInstruction({
          stakerWalletAddress: profile.walletAddress,
          vrntMint: wallet.vrntMint,
          amountVrnt: amount
        });
        instructions = [instruction];
      } else if (action === 'request_unstake') {
        if (!amount || amount <= 0) {
          throw new Error('Unstake amount is required');
        }
        instructions = [await buildRequestUnstakeInstruction({
          stakerWalletAddress: profile.walletAddress,
          amountVrnt: amount
        })];
      } else if (action === 'finalize_unstake') {
        instructions = [await buildFinalizeUnstakeInstruction({
          stakerWalletAddress: profile.walletAddress,
          vrntMint: wallet.vrntMint
        })];
      } else {
        instructions = [await buildClaimRewardsInstruction({
          stakerWalletAddress: profile.walletAddress,
          vrntMint: wallet.vrntMint
        })];
      }

      const chainResult = await signAndConfirmInstructions(instructions);
      const result = await stakeApi({
        profileId: profile.id,
        amount,
        action,
        transactionHash: chainResult.signature,
        explorerUrl: chainResult.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      });
      setWallet(result.wallet);
      setProfile(result.profile);
      await hydrate();
      return {
        transactionHash: result.transactionHash,
        explorerUrl: result.explorerUrl,
        confirmedSlot: chainResult.confirmedSlot
      };
    },
    analyzeFleet: analyzeFleetApi
  }), [profile, wallet, listings, myListings, rentingRentals, lendingRentals, conversations, notifications, transactions, devices, loading, error, privyLogout, embeddedWallets, signAndSendTransaction, connection]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
