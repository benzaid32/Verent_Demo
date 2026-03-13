create extension if not exists "pgcrypto";

create table if not exists profiles (
  id text primary key,
  email text not null unique,
  username text not null,
  wallet_address text not null unique,
  role text not null check (role in ('renter', 'owner', 'both')),
  tier int not null default 1 check (tier in (1, 2, 3)),
  reputation_score int not null default 0,
  avatar_url text not null,
  bio text default '',
  notify_rentals boolean not null default true,
  notify_marketing boolean not null default false,
  notify_security boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  address text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  sol_balance numeric not null default 0,
  usdc_balance numeric not null default 0,
  vrnt_balance numeric not null default 0,
  staked_vrnt_balance numeric not null default 0,
  pending_yield_usdc numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists listings (
  id text primary key,
  owner_id text not null references profiles(id) on delete cascade,
  owner_name text not null,
  owner_avatar text not null,
  title text not null,
  description text not null,
  category text not null check (category in ('Camera', 'Drone', 'Lighting', 'Compute', 'Audio', 'Event', 'Other')),
  product_type text,
  specs text[] not null default '{}',
  location text not null,
  daily_rate_usdc numeric not null,
  collateral_value_usdc numeric not null,
  image_url text not null,
  availability text not null check (availability in ('active', 'rented', 'maintenance')),
  created_at timestamptz not null default now()
);

create table if not exists rentals (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  item_title text not null,
  renter_id text not null references profiles(id) on delete cascade,
  owner_id text not null references profiles(id) on delete cascade,
  renter_wallet_address text,
  owner_wallet_address text,
  start_date date not null,
  end_date date not null,
  total_cost numeric not null,
  collateral_locked numeric not null,
  status text not null check (status in ('pending_approval', 'pending_pickup', 'active', 'return_pending', 'completed', 'cancelled', 'failed')),
  thumbnail text not null,
  transaction_hash text,
  explorer_url text,
  pickup_code text,
  return_code text,
  program_id text,
  rental_escrow_pda text,
  payment_vault text,
  collateral_vault text,
  settlement_mint text,
  treasury_usdc_account text,
  status_reason text,
  confirmed_signature text,
  confirmed_slot bigint,
  chain_cluster text,
  protocol_version text,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdraw', 'rental_payment', 'payout', 'stake', 'unstake', 'claim_yield', 'request_unstake', 'finalize_unstake', 'claim_rewards')),
  amount numeric not null,
  currency text not null check (currency in ('USDC', 'SOL', 'VRNT')),
  date date not null,
  status text not null check (status in ('completed', 'confirmed', 'pending', 'failed')),
  hash text not null,
  explorer_url text
);

create table if not exists conversations (
  id text primary key,
  profile_id text references profiles(id) on delete cascade,
  participant_id text not null,
  participant_name text not null,
  participant_avatar text not null,
  participant_role text not null check (participant_role in ('Owner', 'Renter')),
  related_item_id text,
  related_item_title text,
  last_message text not null default '',
  last_message_date text not null default '',
  unread_count int not null default 0
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null references profiles(id) on delete cascade,
  text text not null,
  timestamp timestamptz not null default now(),
  is_read boolean not null default false
);

create table if not exists notifications (
  id text primary key,
  profile_id text references profiles(id) on delete cascade,
  type text not null check (type in ('rental', 'security', 'system', 'wallet')),
  title text not null,
  message text not null,
  timestamp text not null,
  is_read boolean not null default false,
  link text
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  profile_id text references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
