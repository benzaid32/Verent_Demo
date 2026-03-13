alter table listings
  add column if not exists product_type text;

alter table listings
  drop constraint if exists listings_category_check;

alter table listings
  add constraint listings_category_check
  check (category in ('Camera', 'Drone', 'Lighting', 'Compute', 'Audio', 'Event', 'Other'));
