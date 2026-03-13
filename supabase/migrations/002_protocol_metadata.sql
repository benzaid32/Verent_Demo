alter table if exists listings
  add column if not exists owner_wallet_address text,
  add column if not exists program_id text,
  add column if not exists listing_pda text,
  add column if not exists settlement_mint text,
  add column if not exists chain_cluster text,
  add column if not exists protocol_version text,
  add column if not exists confirmed_signature text,
  add column if not exists confirmed_slot bigint;

alter table if exists rentals
  add column if not exists program_id text,
  add column if not exists rental_escrow_pda text,
  add column if not exists payment_vault text,
  add column if not exists collateral_vault text,
  add column if not exists status_reason text,
  add column if not exists confirmed_signature text,
  add column if not exists confirmed_slot bigint,
  add column if not exists chain_cluster text,
  add column if not exists protocol_version text;
