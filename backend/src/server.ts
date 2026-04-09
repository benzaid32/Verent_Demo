import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import type { CreateListingRequest, CreateRentalRequest, LoginRequest, RentalActionRequest, RentalVerificationRequest, SettingsUpdateRequest, StakeRequest, UpdateListingRequest, WithdrawRequest } from '../../shared/contracts.js';
import { createSession, requireSession } from './auth.js';
import { buildQuote } from './domain.js';
import { assertRequiredEnv, env, getEnvIssues } from './env.js';
import { analyzeFleet } from './gemini.js';
import { attachRentalProtocolMetadata } from './protocol-indexer.js';
import { verifyPrivyToken } from './privy.js';
import { assertAccountExists, assertSolanaRpcReady, confirmSignature, getTreasuryStatus, submitWithdrawalMemo } from './solana.js';
import { addMessage, applyWithdrawal, assertStorageReady, createListing, createOrOpenConversation, createRental, createTransaction, getDashboard, getPersistenceStatus, markConversationRead, markNotificationsRead, updateListing, updateRental, updateSettings, upsertDemoProfile } from './store.js';

assertRequiredEnv();

const app = Fastify({
  logger: {
    level: 'info'
  }
});

await app.register(cors, {
  origin: env.APP_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS']
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (reply.sent) {
    return;
  }
  reply.code(500).send({
    message: error instanceof Error ? error.message : 'Internal server error'
  });
});

app.addHook('onRequest', async (request) => {
  request.log = request.log.child({
    requestId: request.id
  });
});

app.get('/health', async () => ({
  status: 'ok',
  service: 'verent-backend',
  uptimeSeconds: process.uptime(),
  nodeEnv: env.NODE_ENV
}));

app.get('/ready', async (_request, reply) => {
  const checks = {
    env: {
      ok: false,
      issues: [] as string[]
    },
    storage: {
      ok: false,
      configuredProvider: env.DATA_PROVIDER,
      activeProvider: getPersistenceStatus().activeProvider,
      usingPersistentStorage: getPersistenceStatus().usingPersistentStorage
    },
    solana: {
      ok: false,
      cluster: env.SOLANA_CLUSTER,
      rpcUrl: env.SOLANA_RPC_URL
    },
    privy: {
      ok: false,
      appIdConfigured: Boolean(env.PRIVY_APP_ID),
      verificationKeyConfigured: Boolean(env.PRIVY_VERIFICATION_KEY)
    },
    treasury: {
      ok: false,
      ...getTreasuryStatus()
    }
  };

  const envIssues = getEnvIssues();
  checks.env.ok = envIssues.length === 0;
  checks.env.issues = envIssues;

  try {
    const storage = await assertStorageReady();
    checks.storage.ok = true;
    checks.storage.configuredProvider = storage.configuredProvider;
    checks.storage.activeProvider = storage.activeProvider;
    checks.storage.usingPersistentStorage = storage.usingPersistentStorage;
  } catch (error) {
    checks.storage.ok = false;
  }

  try {
    await assertSolanaRpcReady();
    checks.solana.ok = true;
  } catch {
    checks.solana.ok = false;
  }

  checks.privy.ok = env.DEMO_MODE || Boolean(env.PRIVY_APP_ID && env.PRIVY_VERIFICATION_KEY);
  checks.treasury.ok = checks.treasury.configured;

  const ready = checks.env.ok && checks.storage.ok && checks.solana.ok && checks.privy.ok && checks.treasury.ok;
  return reply.code(ready ? 200 : 503).send({
    status: ready ? 'ready' : 'not_ready',
    checks
  });
});

app.post<{ Body: LoginRequest }>('/auth/login', async (request, reply) => {
  if (!env.DEMO_MODE && !request.body.privyToken) {
    return reply.code(400).send({ message: 'Privy token required outside demo mode' });
  }

  let email = request.body.email;
  let privySubject: string | undefined;
  let walletAddress: string | undefined;

  if (request.body.privyToken) {
    const privyIdentity = await verifyPrivyToken(request.body.privyToken);
    email = privyIdentity.email || email;
    privySubject = privyIdentity.subject || undefined;
    walletAddress = privyIdentity.walletAddress || undefined;
  }

  if (!walletAddress && request.body.walletAddress) {
    walletAddress = request.body.walletAddress.trim();
  }

  if (!env.DEMO_MODE && !walletAddress) {
    return reply.code(400).send({ message: 'Privy wallet address missing; ensure embedded Solana wallet is enabled for this user' });
  }

  const profile = await upsertDemoProfile(email, request.body.role, {
    subject: privySubject,
    walletAddress
  });
  const session = await createSession(profile);
  return reply.send(session);
});

app.get('/bootstrap', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  return reply.send(dashboard);
});

app.post<{ Body: CreateListingRequest }>('/listings', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  if (!env.DEMO_MODE) {
    if (!request.body.id || !request.body.transactionHash || !request.body.explorerUrl) {
      return reply.code(400).send({ message: 'On-chain listing creation requires id, transactionHash, and explorerUrl.' });
    }
    const confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
    request.body.confirmedSlot = confirmedSlot;
  }

  const listing = await createListing(session.sub, request.body);
  if (!env.DEMO_MODE && listing.listingPda) {
    await assertAccountExists(listing.listingPda);
  }
  return reply.code(201).send(listing);
});

app.patch<{ Params: { listingId: string }; Body: UpdateListingRequest }>('/listings/:listingId', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const existingListing = dashboard.myListings.find((item) => item.id === request.params.listingId);
  if (!existingListing) {
    return reply.code(404).send({ message: 'Listing not found' });
  }

  if (!env.DEMO_MODE) {
    if (!request.body.transactionHash || !request.body.explorerUrl) {
      return reply.code(400).send({ message: 'On-chain listing update requires transactionHash and explorerUrl.' });
    }
    request.body.confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
    if (existingListing.listingPda) {
      await assertAccountExists(existingListing.listingPda);
    }
  }

  const listing = await updateListing(request.params.listingId, {
    title: request.body.title,
    category: request.body.category,
    productType: request.body.productType?.trim() || undefined,
    description: request.body.description,
    location: request.body.location,
    specs: request.body.specs,
    dailyRateUsdc: request.body.dailyRateUsdc,
    collateralValueUsdc: request.body.dailyRateUsdc * 50,
    confirmedSignature: request.body.transactionHash,
    confirmedSlot: request.body.confirmedSlot
  });

  return reply.send(listing);
});

app.post<{ Body: { listingId: string; days: number } }>('/rentals/quote', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const listing = dashboard.listings.find((item) => item.id === request.body.listingId);
  if (!listing) {
    return reply.code(404).send({ message: 'Listing not found' });
  }

  return reply.send(buildQuote(listing, dashboard.profile, request.body.days));
});

app.post<{ Body: CreateRentalRequest }>('/rentals', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const listing = dashboard.listings.find((item) => item.id === request.body.listingId);
  if (!listing) {
    return reply.code(404).send({ message: 'Listing not found' });
  }

  const quote = buildQuote(listing, dashboard.profile, request.body.days);
  const rentalId = request.body.id || `rnt_${crypto.randomUUID().slice(0, 8)}`;

  if (!env.DEMO_MODE) {
    if (!request.body.transactionHash || !request.body.explorerUrl || !request.body.rentalEscrowPda || !request.body.paymentVault || !request.body.collateralVault) {
      return reply.code(400).send({ message: 'Real rental escrow requires confirmed transaction metadata and escrow vault addresses.' });
    }
    request.body.confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
    await assertAccountExists(request.body.rentalEscrowPda);
    await assertAccountExists(request.body.paymentVault);
    await assertAccountExists(request.body.collateralVault);
  }

  const rental = await createRental(attachRentalProtocolMetadata({
    id: rentalId,
    listingId: listing.id,
    itemTitle: listing.title,
    renterId: session.sub,
    ownerId: listing.ownerId,
    renterWalletAddress: dashboard.profile.walletAddress,
    ownerWalletAddress: listing.ownerWalletAddress,
    startDate: request.body.startDate,
    endDate: request.body.endDate,
    totalCost: quote.rentalTotal,
    collateralLocked: quote.requiredCollateral,
    status: env.DEMO_MODE ? 'pending_pickup' : 'pending_approval',
    thumbnail: listing.imageUrl,
    transactionHash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl,
    pickupCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
    returnCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    confirmedSignature: request.body.transactionHash,
    confirmedSlot: request.body.confirmedSlot,
    rentalEscrowPda: request.body.rentalEscrowPda,
    paymentVault: request.body.paymentVault,
    collateralVault: request.body.collateralVault
  }, dashboard.profile.walletAddress, listing.listingPda));

  if (request.body.transactionHash) {
    await createTransaction({
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
      profileId: session.sub,
      type: 'rental_payment',
      amount: quote.totalUpfrontCost,
      currency: 'USDC',
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      hash: request.body.transactionHash,
      explorerUrl: request.body.explorerUrl
    });
  }

  return reply.code(201).send({
    rental,
    quote
  });
});

app.post<{ Params: { rentalId: string }; Body: RentalActionRequest }>('/rentals/:rentalId/accept', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const existingRental = dashboard.lendingRentals.find((item) => item.id === request.params.rentalId);
  if (!existingRental) {
    return reply.code(404).send({ message: 'Rental not found' });
  }

  if (!request.body.transactionHash || !request.body.explorerUrl) {
    return reply.code(400).send({ message: 'Confirmed owner transaction metadata is required.' });
  }

  const confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
  const rental = await updateRental(request.params.rentalId, {
    status: 'pending_pickup',
    transactionHash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl,
    confirmedSignature: request.body.transactionHash,
    confirmedSlot,
    statusReason: 'accepted_on_chain'
  });
  return reply.send(rental);
});

app.post<{ Params: { rentalId: string }; Body: RentalVerificationRequest }>('/rentals/:rentalId/pickup', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const rental = dashboard.lendingRentals.find((item) => item.id === request.params.rentalId);
  if (!rental) {
    return reply.code(404).send({ message: 'Rental not found' });
  }
  if (rental.status !== 'pending_pickup') {
    return reply.code(400).send({ message: 'Rental is not ready for pickup confirmation.' });
  }
  if (!rental.pickupCode || rental.pickupCode.trim().toUpperCase() !== request.body.code.trim().toUpperCase()) {
    return reply.code(400).send({ message: 'Pickup code does not match this rental.' });
  }

  const confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
  const updatedRental = await updateRental(request.params.rentalId, {
    status: 'active',
    transactionHash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl,
    confirmedSignature: request.body.transactionHash,
    confirmedSlot,
    statusReason: 'pickup_confirmed_on_chain'
  });
  return reply.send(updatedRental);
});

app.post<{ Params: { rentalId: string }; Body: RentalVerificationRequest }>('/rentals/:rentalId/complete', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const rental = dashboard.lendingRentals.find((item) => item.id === request.params.rentalId);
  if (!rental) {
    return reply.code(404).send({ message: 'Rental not found' });
  }
  if (rental.status !== 'active') {
    return reply.code(400).send({ message: 'Rental is not active and cannot be completed yet.' });
  }
  if (!rental.returnCode || rental.returnCode.trim().toUpperCase() !== request.body.code.trim().toUpperCase()) {
    return reply.code(400).send({ message: 'Return code does not match this rental.' });
  }

  const confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
  const updatedRental = await updateRental(request.params.rentalId, {
    status: 'completed',
    transactionHash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl,
    confirmedSignature: request.body.transactionHash,
    confirmedSlot,
    statusReason: 'completed_on_chain'
  });
  return reply.send(updatedRental);
});

app.post<{ Body: WithdrawRequest }>('/wallet/withdraw', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  if (request.body.transactionHash && request.body.explorerUrl) {
    await createTransaction({
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
      profileId: session.sub,
      type: 'withdraw',
      amount: request.body.amount,
      currency: request.body.currency,
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      hash: request.body.transactionHash,
      explorerUrl: request.body.explorerUrl
    });
    const dashboard = await getDashboard(session.sub);
    return reply.send({
      wallet: dashboard.wallet,
      transactionHash: request.body.transactionHash,
      explorerUrl: request.body.explorerUrl
    });
  }

  if (!env.DEMO_MODE && request.body.currency === 'SOL') {
    return reply.code(400).send({ message: 'SOL withdrawals must be signed by the embedded wallet client' });
  }

  const tx = await submitWithdrawalMemo(request.body.recipientAddress, request.body.amount, request.body.currency);
  const wallet = await applyWithdrawal(session.sub, request.body, tx.signature, tx.explorerUrl);
  return reply.send({
    wallet,
    transactionHash: tx.signature,
    explorerUrl: tx.explorerUrl
  });
});

app.post<{ Body: StakeRequest }>('/staking', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  if (!request.body.transactionHash || !request.body.explorerUrl) {
    return reply.code(400).send({ message: 'Confirmed staking transaction metadata is required.' });
  }

  const confirmedSlot = request.body.confirmedSlot ?? await confirmSignature(request.body.transactionHash);
  const dashboard = await getDashboard(session.sub);
  const transactionType = request.body.action === 'claim_rewards'
    ? 'claim_rewards'
    : request.body.action === 'stake'
      ? 'stake'
      : request.body.action;

  await createTransaction({
    id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    profileId: session.sub,
    type: transactionType,
    amount: request.body.amount ?? 0,
    currency: 'VRNT',
    date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    hash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl
  });

  return reply.send({
    wallet: dashboard.wallet,
    profile: dashboard.profile,
    transactionHash: request.body.transactionHash,
    explorerUrl: request.body.explorerUrl,
    confirmedSlot
  });
});

app.post<{ Body: { listingId: string } }>('/conversations/open', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const conversation = await createOrOpenConversation(session.sub, request.body.listingId);
  return reply.send(conversation);
});

app.post<{ Params: { conversationId: string }; Body: { text: string } }>('/conversations/:conversationId/messages', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const conversation = await addMessage(request.params.conversationId, session.sub, request.body.text);
  return reply.send(conversation);
});

app.post<{ Params: { conversationId: string } }>('/conversations/:conversationId/read', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const conversation = await markConversationRead(session.sub, request.params.conversationId);
  return reply.send(conversation);
});

app.post('/notifications/mark-read', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const notifications = await markNotificationsRead(session.sub);
  return reply.send(notifications);
});

app.post<{ Body: SettingsUpdateRequest }>('/settings', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const profile = await updateSettings(session.sub, request.body);
  return reply.send(profile);
});

app.get('/ai/fleet-analysis', async (request, reply) => {
  const session = await requireSession(request, reply);
  if (!session) {
    return;
  }

  const dashboard = await getDashboard(session.sub);
  const analysis = await analyzeFleet(dashboard.devices);
  return reply.send(analysis);
});

const closeSignals = ['SIGINT', 'SIGTERM'] as const;
for (const signal of closeSignals) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

app.listen({
  port: env.PORT,
  host: env.HOST
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
