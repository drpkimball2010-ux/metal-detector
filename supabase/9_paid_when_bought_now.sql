-- Track My Stack: let "Bought just now" purchases keep the price the user typed in.
-- Run once in the SQL Editor. Safe to run again.
-- Before: a "bought just now" purchase always had its paid amount replaced with spot.
-- Now: if a price is entered it's kept; if it's left blank it's still logged at spot.

create or replace function public.set_purchase_spot()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target timestamptz;
  hit    record;
begin
  new.user_id := auth.uid();            -- can't insert rows for someone else
  if new.bought_now then
    new.bought_on := null;
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

-- Check: should say "kept what you typed"
select case when position('new.paid := null' in pg_get_functiondef('public.set_purchase_spot'::regproc)) = 0
            then 'Updated: kept what you typed' else 'Not updated yet' end as status;
