import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import type {
  CreateListingRequest,
  CreateRentalRequest,
  LoginRequest,
  Profile,
  RentalActionRequest,
  RentalVerificationRequest,
  SettingsUpdateRequest,
  StakeRequest,
  UpdateListingRequest,
  WithdrawRequest
} from '../../shared/contracts.js';
import { buildQuote } from './domain.js';
import { assertRequiredEnv, env, getEnvIssues, setEnvSource } from './env.js';
import { analyzeFleet } from './gemini.js';
import { attachRentalProtocolMetadata } from './protocol-indexer.js';
import { verifyPrivyToken } from './privy.js';
import {
  assertAccountExists,
  assertSolanaRpcReady,
  confirmSignature,
  getTreasuryStatus,
  submitWithdrawalMemo
} from './solana.js';
import {
  addMessage,
  applyWithdrawal,
  assertStorageReady,
  createListing,
  createOrOpenConversation,
  createRental,
  createTransaction,
  getDashboard,
  getPersistenceStatus,
  markConversationRead,
  markConversationUnread,
  markNotificationsRead,
  updateListing,
  updateRental,
  updateSettings,
  upsertDemoProfile
} from './store.js';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = (env.APP_ORIGIN ?? '').split(',').map((value) => value.trim()).filter(Boolean);
      if (allowed.length === 0 || !origin) {
        return origin ?? '*';
      }
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type']
  })
);

app.onError((error, c) => {
  console.error('Worker error:', error);
  return c.json(
    {
      message: error instanceof Error ? error.message : 'Internal server error'
    },
    500
  );
});

let envAsserted = false;
function ensureEnvAsserted() {
  if (envAsserted) {
    return;
  }
  assertRequiredEnv();
  envAsserted = true;
}

app.use('*', async (c, next) => {
  setEnvSource(c.env as Record<string, unknown>);
  ensureEnvAsserted();
  await next();
});

interface SessionClaims {
  sub: string;
  email: string;
}

function getJwtSecret() {
  return new TextEncoder().encode(env.BACKEND_JWT_SECRET);
}

async function createSession(profile: Profile) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const accessToken = await new SignJWT({ email: profile.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(profile.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getJwtSecret());

  return {
    accessToken,
    expiresAt,
    profile
  };
}

async function verifySessionToken(token: string): Promise<SessionClaims> {
  const verified = await jwtVerify(token, getJwtSecret());
  return {
    sub: verified.payload.sub ?? '',
    email: String(verified.payload.email ?? '')
  };
}

async function requireSession(c: any): Promise<SessionClaims | null> {
  const authorization = c.req.header('authorization') ?? c.req.header('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    return null;
  }
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

async function withSession(c: any, handler: (session: SessionClaims) => Promise<Response>) {
  const session = await requireSession(c);
  if (!session) {
    return c.json({ message: 'Missing or invalid access token' }, 401);
  }
  return handler(session);
}

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'verent-backend',
    nodeEnv: env.NODE_ENV
  })
);

function redactRpcUrl(raw: string | undefined): string {
  if (!raw) {
    return '';
  }
  try {
    const url = new URL(raw);
    // Drop query string (may contain api-key) and any auth info.
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return 'redacted';
  }
}

app.get('/ready', async (c) => {
  const persistence = getPersistenceStatus();
  const checks = {
    env: { ok: false, issues: [] as string[] },
    storage: {
      ok: false,
      configuredProvider: env.DATA_PROVIDER,
      activeProvider: persistence.activeProvider,
      usingPersistentStorage: persistence.usingPersistentStorage
    },
    solana: {
      ok: false,
      cluster: env.SOLANA_CLUSTER,
      rpcUrl: redactRpcUrl(env.SOLANA_RPC_URL),
      rpcProviderConfigured: Boolean(env.SOLANA_RPC_URL)
    },
    privy: {
      ok: false,
      appIdConfigured: Boolean(env.PRIVY_APP_ID),
      verificationKeyConfigured: Boolean(env.PRIVY_VERIFICATION_KEY)
    },
    treasury: { ok: false, configured: getTreasuryStatus().configured }
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
  } catch {
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
  return c.json({ status: ready ? 'ready' : 'not_ready', checks }, ready ? 200 : 503);
});

app.post('/auth/login', async (c) => {
  const body = (await c.req.json()) as LoginRequest;
  if (!env.DEMO_MODE && !body.privyToken) {
    return c.json({ message: 'Privy token required outside demo mode' }, 400);
  }

  let email = body.email;
  let privySubject: string | undefined;
  let walletAddress: string | undefined;

  if (body.privyToken) {
    const privyIdentity = await verifyPrivyToken(body.privyToken);
    email = privyIdentity.email || email;
    privySubject = privyIdentity.subject || undefined;
    walletAddress = privyIdentity.walletAddress || undefined;
  }

  if (!walletAddress && body.walletAddress) {
    walletAddress = body.walletAddress.trim();
  }

  if (!env.DEMO_MODE && !walletAddress) {
    return c.json(
      {
        message:
          'Privy wallet address missing; ensure embedded Solana wallet is enabled for this user'
      },
      400
    );
  }

  const profile = await upsertDemoProfile(email, body.role, {
    subject: privySubject,
    walletAddress
  });
  const session = await createSession(profile);
  return c.json(session);
});

app.get('/bootstrap', (c) =>
  withSession(c, async (session) => {
    const dashboard = await getDashboard(session.sub);
    return c.json(dashboard);
  })
);

app.post('/listings', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as CreateListingRequest;
    if (!env.DEMO_MODE) {
      if (!body.id || !body.transactionHash || !body.explorerUrl) {
        return c.json(
          { message: 'On-chain listing creation requires id, transactionHash, and explorerUrl.' },
          400
        );
      }
      const confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
      body.confirmedSlot = confirmedSlot;
    }

    const listing = await createListing(session.sub, body);
    if (!env.DEMO_MODE && listing.listingPda) {
      await assertAccountExists(listing.listingPda);
    }
    return c.json(listing, 201);
  })
);

app.patch('/listings/:listingId', (c) =>
  withSession(c, async (session) => {
    const listingId = c.req.param('listingId');
    const body = (await c.req.json()) as UpdateListingRequest;

    const dashboard = await getDashboard(session.sub);
    const existingListing = dashboard.myListings.find((item) => item.id === listingId);
    if (!existingListing) {
      return c.json({ message: 'Listing not found' }, 404);
    }

    if (!env.DEMO_MODE) {
      if (!body.transactionHash || !body.explorerUrl) {
        return c.json(
          { message: 'On-chain listing update requires transactionHash and explorerUrl.' },
          400
        );
      }
      body.confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
      if (existingListing.listingPda) {
        await assertAccountExists(existingListing.listingPda);
      }
    }

    const listing = await updateListing(listingId, {
      title: body.title,
      category: body.category,
      productType: body.productType?.trim() || undefined,
      description: body.description,
      location: body.location,
      specs: body.specs,
      dailyRateUsdc: body.dailyRateUsdc,
      collateralValueUsdc: body.dailyRateUsdc * 50,
      confirmedSignature: body.transactionHash,
      confirmedSlot: body.confirmedSlot
    });

    return c.json(listing);
  })
);

app.post('/rentals/quote', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as { listingId: string; days: number };
    const dashboard = await getDashboard(session.sub);
    const listing = dashboard.listings.find((item) => item.id === body.listingId);
    if (!listing) {
      return c.json({ message: 'Listing not found' }, 404);
    }
    return c.json(buildQuote(listing, dashboard.profile, body.days));
  })
);

app.post('/rentals', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as CreateRentalRequest;
    const dashboard = await getDashboard(session.sub);
    const listing = dashboard.listings.find((item) => item.id === body.listingId);
    if (!listing) {
      return c.json({ message: 'Listing not found' }, 404);
    }

    const quote = buildQuote(listing, dashboard.profile, body.days);
    const rentalId = body.id || `rnt_${crypto.randomUUID().slice(0, 8)}`;

    if (!env.DEMO_MODE) {
      if (
        !body.transactionHash ||
        !body.explorerUrl ||
        !body.rentalEscrowPda ||
        !body.paymentVault ||
        !body.collateralVault
      ) {
        return c.json(
          {
            message:
              'Real rental escrow requires confirmed transaction metadata and escrow vault addresses.'
          },
          400
        );
      }
      body.confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
      await assertAccountExists(body.rentalEscrowPda);
      await assertAccountExists(body.paymentVault);
      await assertAccountExists(body.collateralVault);
    }

    const rental = await createRental(
      attachRentalProtocolMetadata(
        {
          id: rentalId,
          listingId: listing.id,
          itemTitle: listing.title,
          renterId: session.sub,
          ownerId: listing.ownerId,
          renterWalletAddress: dashboard.profile.walletAddress,
          ownerWalletAddress: listing.ownerWalletAddress,
          startDate: body.startDate,
          endDate: body.endDate,
          totalCost: quote.rentalTotal,
          collateralLocked: quote.requiredCollateral,
          status: env.DEMO_MODE ? 'pending_pickup' : 'pending_approval',
          thumbnail: listing.imageUrl,
          transactionHash: body.transactionHash,
          explorerUrl: body.explorerUrl,
          pickupCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
          returnCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
          createdAt: new Date().toISOString(),
          confirmedSignature: body.transactionHash,
          confirmedSlot: body.confirmedSlot,
          rentalEscrowPda: body.rentalEscrowPda,
          paymentVault: body.paymentVault,
          collateralVault: body.collateralVault
        },
        dashboard.profile.walletAddress,
        listing.listingPda
      )
    );

    if (body.transactionHash) {
      await createTransaction({
        id: `tx_${crypto.randomUUID().slice(0, 8)}`,
        profileId: session.sub,
        type: 'rental_payment',
        amount: quote.totalUpfrontCost,
        currency: 'USDC',
        date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        hash: body.transactionHash,
        explorerUrl: body.explorerUrl
      });
    }

    return c.json({ rental, quote }, 201);
  })
);

app.post('/rentals/:rentalId/accept', (c) =>
  withSession(c, async (session) => {
    const rentalId = c.req.param('rentalId');
    const body = (await c.req.json()) as RentalActionRequest;

    const dashboard = await getDashboard(session.sub);
    const existingRental = dashboard.lendingRentals.find((item) => item.id === rentalId);
    if (!existingRental) {
      return c.json({ message: 'Rental not found' }, 404);
    }
    if (!body.transactionHash || !body.explorerUrl) {
      return c.json({ message: 'Confirmed owner transaction metadata is required.' }, 400);
    }

    const confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
    const rental = await updateRental(rentalId, {
      status: 'pending_pickup',
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
      confirmedSignature: body.transactionHash,
      confirmedSlot,
      statusReason: 'accepted_on_chain'
    });
    return c.json(rental);
  })
);

app.post('/rentals/:rentalId/pickup', (c) =>
  withSession(c, async (session) => {
    const rentalId = c.req.param('rentalId');
    const body = (await c.req.json()) as RentalVerificationRequest;

    const dashboard = await getDashboard(session.sub);
    const rental = dashboard.lendingRentals.find((item) => item.id === rentalId);
    if (!rental) {
      return c.json({ message: 'Rental not found' }, 404);
    }
    if (rental.status !== 'pending_pickup') {
      return c.json({ message: 'Rental is not ready for pickup confirmation.' }, 400);
    }
    if (!rental.pickupCode || rental.pickupCode.trim().toUpperCase() !== body.code.trim().toUpperCase()) {
      return c.json({ message: 'Pickup code does not match this rental.' }, 400);
    }

    const confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
    const updatedRental = await updateRental(rentalId, {
      status: 'active',
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
      confirmedSignature: body.transactionHash,
      confirmedSlot,
      statusReason: 'pickup_confirmed_on_chain'
    });
    return c.json(updatedRental);
  })
);

app.post('/rentals/:rentalId/complete', (c) =>
  withSession(c, async (session) => {
    const rentalId = c.req.param('rentalId');
    const body = (await c.req.json()) as RentalVerificationRequest;

    const dashboard = await getDashboard(session.sub);
    const rental = dashboard.lendingRentals.find((item) => item.id === rentalId);
    if (!rental) {
      return c.json({ message: 'Rental not found' }, 404);
    }
    if (rental.status !== 'active') {
      return c.json({ message: 'Rental is not active and cannot be completed yet.' }, 400);
    }
    if (!rental.returnCode || rental.returnCode.trim().toUpperCase() !== body.code.trim().toUpperCase()) {
      return c.json({ message: 'Return code does not match this rental.' }, 400);
    }

    const confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
    const updatedRental = await updateRental(rentalId, {
      status: 'completed',
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
      confirmedSignature: body.transactionHash,
      confirmedSlot,
      statusReason: 'completed_on_chain'
    });
    return c.json(updatedRental);
  })
);

app.post('/wallet/withdraw', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as WithdrawRequest;

    if (body.transactionHash && body.explorerUrl) {
      await createTransaction({
        id: `tx_${crypto.randomUUID().slice(0, 8)}`,
        profileId: session.sub,
        type: 'withdraw',
        amount: body.amount,
        currency: body.currency,
        date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        hash: body.transactionHash,
        explorerUrl: body.explorerUrl
      });
      const dashboard = await getDashboard(session.sub);
      return c.json({
        wallet: dashboard.wallet,
        transactionHash: body.transactionHash,
        explorerUrl: body.explorerUrl
      });
    }

    if (!env.DEMO_MODE && body.currency === 'SOL') {
      return c.json({ message: 'SOL withdrawals must be signed by the embedded wallet client' }, 400);
    }

    const tx = await submitWithdrawalMemo(body.recipientAddress, body.amount, body.currency);
    const wallet = await applyWithdrawal(session.sub, body, tx.signature, tx.explorerUrl);
    return c.json({
      wallet,
      transactionHash: tx.signature,
      explorerUrl: tx.explorerUrl
    });
  })
);

app.post('/staking', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as StakeRequest;

    if (!body.transactionHash || !body.explorerUrl) {
      return c.json({ message: 'Confirmed staking transaction metadata is required.' }, 400);
    }

    const confirmedSlot = body.confirmedSlot ?? (await confirmSignature(body.transactionHash));
    const dashboard = await getDashboard(session.sub);
    const transactionType =
      body.action === 'claim_rewards'
        ? 'claim_rewards'
        : body.action === 'stake'
        ? 'stake'
        : body.action;

    await createTransaction({
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
      profileId: session.sub,
      type: transactionType,
      amount: body.amount ?? 0,
      currency: 'VRNT',
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      hash: body.transactionHash,
      explorerUrl: body.explorerUrl
    });

    return c.json({
      wallet: dashboard.wallet,
      profile: dashboard.profile,
      transactionHash: body.transactionHash,
      explorerUrl: body.explorerUrl,
      confirmedSlot
    });
  })
);

app.post('/conversations/open', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as { listingId: string };
    const conversation = await createOrOpenConversation(session.sub, body.listingId);
    return c.json(conversation);
  })
);

app.post('/conversations/:conversationId/messages', (c) =>
  withSession(c, async (session) => {
    const conversationId = c.req.param('conversationId');
    const body = (await c.req.json()) as { text: string };
    const conversation = await addMessage(conversationId, session.sub, body.text);
    return c.json(conversation);
  })
);

app.post('/conversations/:conversationId/read', (c) =>
  withSession(c, async (session) => {
    const conversationId = c.req.param('conversationId');
    const conversation = await markConversationRead(session.sub, conversationId);
    return c.json(conversation);
  })
);

app.post('/conversations/:conversationId/unread', (c) =>
  withSession(c, async (session) => {
    const conversationId = c.req.param('conversationId');
    const conversation = await markConversationUnread(session.sub, conversationId);
    return c.json(conversation);
  })
);

app.post('/notifications/mark-read', (c) =>
  withSession(c, async (session) => {
    const notifications = await markNotificationsRead(session.sub);
    return c.json(notifications);
  })
);

app.post('/settings', (c) =>
  withSession(c, async (session) => {
    const body = (await c.req.json()) as SettingsUpdateRequest;
    const profile = await updateSettings(session.sub, body);
    return c.json(profile);
  })
);

app.get('/ai/fleet-analysis', (c) =>
  withSession(c, async (session) => {
    const dashboard = await getDashboard(session.sub);
    const analysis = await analyzeFleet(dashboard.devices);
    return c.json(analysis);
  })
);

export default app;
