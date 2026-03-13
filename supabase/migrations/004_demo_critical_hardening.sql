alter table if exists profiles
  add column if not exists notify_rentals boolean not null default true,
  add column if not exists notify_marketing boolean not null default false,
  add column if not exists notify_security boolean not null default true;

alter table if exists rentals
  add column if not exists renter_wallet_address text,
  add column if not exists owner_wallet_address text,
  add column if not exists settlement_mint text,
  add column if not exists treasury_usdc_account text;

alter table if exists conversations
  add column if not exists profile_id text references profiles(id) on delete cascade;

alter table if exists notifications
  add column if not exists profile_id text references profiles(id) on delete cascade;

update conversations
set profile_id = participant_id
where profile_id is null;
