alter table if exists transactions
  drop constraint if exists transactions_type_check;

alter table if exists transactions
  add constraint transactions_type_check
  check (type in (
    'deposit',
    'withdraw',
    'rental_payment',
    'payout',
    'stake',
    'unstake',
    'claim_yield',
    'request_unstake',
    'finalize_unstake',
    'claim_rewards'
  ));
