-- Metal Stack Ledger: Supabase database setup
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------
-- 1. Current spot prices (one row per metal, overwritten every update)
-- ---------------------------------------------------------------
create table public.spot_prices (
  metal      text primary key check (metal in ('XAU','XAG','XPT','XPD')),
  price      numeric(12,4) not null check (price > 0),   -- USD per troy ounce
  quoted_at  timestamptz not null,                       -- time the provider quoted it
  source     text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 2. Price history: one price per metal per hour (daily rows for older history)
-- ---------------------------------------------------------------
create table public.price_history (
  id          bigint generated always as identity primary key,
  metal       text not null check (metal in ('XAU','XAG','XPT','XPD')),
  price       numeric(12,4) not null check (price > 0),
  bucket      timestamptz not null,   -- start of the hour (or midday for daily rows)
  granularity text not null default 'hour' check (granularity in ('hour','day')),
  source      text,
  unique (metal, bucket)
);
create index price_history_metal_bucket on public.price_history (metal, bucket);

-- ---------------------------------------------------------------
-- 3. Purchases (each user sees and edits only their own)
-- ---------------------------------------------------------------
create table public.purchases (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metal          text not null check (metal in ('XAU','XAG','XPT','XPD')),
  description    text,
  qty            numeric not null check (qty > 0),
  weight         numeric not null check (weight > 0),
  unit           text not null check (unit in ('ozt','g','kg','dwt','oz')),
  purity         numeric not null check (purity > 0 and purity <= 1),
  grade          text,                      -- e.g. 'Sterling (.925)', '22k (.9167)'
  bought_now     boolean not null default true,
  bought_on      date,                      -- required when bought_now is false
  paid           numeric check (paid >= 0), -- null = log it at spot
  paid_from_spot boolean not null default false,
  spot_then      numeric(12,4),             -- set by the database, never by the app
  spot_then_at   timestamptz,               -- which recorded price was used
  created_at     timestamptz not null default now(),
  check (bought_now or bought_on is not null)
);
create index purchases_user on public.purchases (user_id);

-- Fine troy ounces, computed the same way as the ledger page
create or replace function public.fine_oz(p public.purchases)
returns numeric language sql immutable as $$
  select p.qty * p.weight * p.purity * case p.unit
    when 'ozt' then 1
    when 'g'   then 1 / 31.1034768
    when 'kg'  then 1000 / 31.1034768
    when 'dwt' then 0.05
    when 'oz'  then 28.349523125 / 31.1034768
  end;
$$;

-- ---------------------------------------------------------------
-- 4. The database (not the app) decides the spot price at purchase.
--    Bought just now -> current spot. Past date -> that day's recorded price.
--    No price paid  -> paid is logged at that spot price.
--    Users cannot fake these values, because this runs on the server.
-- ---------------------------------------------------------------
create or replace function public.set_purchase_spot()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target timestamptz;
  hit    record;
begin
  new.user_id := auth.uid();            -- can't insert rows for someone else
  if new.bought_now then
    new.bought_on := null;
    new.paid := null;                   -- bought just now always logs at spot
    select price, quoted_at into hit from spot_prices where metal = new.metal;
  else
    if new.bought_on > (now() at time zone 'America/Chicago')::date then
      raise exception 'Purchase date is in the future';
    end if;
    target := (new.bought_on + time '12:00') at time zone 'America/Chicago';
    select price, bucket as quoted_at into hit
      from price_history
     where metal = new.metal
       and bucket between target - interval '72 hours' and target + interval '72 hours'
     order by abs(extract(epoch from bucket - target))
     limit 1;
  end if;

  new.spot_then    := hit.price;        -- null if no price is recorded near that date
  new.spot_then_at := hit.quoted_at;
  new.paid_from_spot := new.paid is null;
  if new.paid_from_spot and hit.price is not null then
    new.paid := round(public.fine_oz(new) * hit.price, 2);
  end if;
  return new;
end $$;

create trigger purchases_set_spot
  before insert on public.purchases
  for each row execute function public.set_purchase_spot();

-- Stop users from editing the spot or user fields after the fact
create or replace function public.lock_purchase_fields()
returns trigger language plpgsql as $$
begin
  new.user_id := old.user_id;
  new.spot_then := old.spot_then;
  new.spot_then_at := old.spot_then_at;
  new.bought_now := old.bought_now;
  new.bought_on := old.bought_on;
  return new;
end $$;

create trigger purchases_lock_fields
  before update on public.purchases
  for each row execute function public.lock_purchase_fields();

-- ---------------------------------------------------------------
-- 5. Row level security
--    Prices: everyone can read, nobody can write from the app.
--    (The price function uses the service key, which bypasses these rules.)
--    Purchases: each signed-in user reads and writes only their own rows.
-- ---------------------------------------------------------------
alter table public.spot_prices   enable row level security;
alter table public.price_history enable row level security;
alter table public.purchases     enable row level security;

create policy "Anyone can read spot prices"
  on public.spot_prices for select to anon, authenticated using (true);

create policy "Anyone can read price history"
  on public.price_history for select to anon, authenticated using (true);

create policy "Users read their own purchases"
  on public.purchases for select to authenticated using (user_id = auth.uid());
create policy "Users add their own purchases"
  on public.purchases for insert to authenticated with check (user_id = auth.uid());
create policy "Users edit their own purchases"
  on public.purchases for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete their own purchases"
  on public.purchases for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 6. Live updates: the app gets new prices the moment they're saved
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.spot_prices;
