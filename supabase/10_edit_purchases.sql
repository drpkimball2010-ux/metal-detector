-- Track My Stack: let users edit their purchases safely.
-- Run once in the SQL Editor. Safe to run again.
-- Users can change the description, quantity, weight, unit, purity and price paid.
-- They still can't change the metal, the date, or the recorded spot price (those stay locked).
-- Price paid: typing an amount keeps it; clearing it logs it at the recorded spot price,
-- and "paid at spot" purchases re-price automatically if the weight or quantity changes.

create or replace function public.lock_purchase_fields()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.user_id      := old.user_id;
    new.metal        := old.metal;
    new.spot_then    := old.spot_then;
    new.spot_then_at := old.spot_then_at;
    new.bought_now   := old.bought_now;
    new.bought_on    := old.bought_on;
    new.created_at   := old.created_at;

    if new.paid is null then
      new.paid_from_spot := true;                 -- cleared: log it at spot
    elsif new.paid is distinct from old.paid then
      new.paid_from_spot := false;                -- the user typed a new amount
    else
      new.paid_from_spot := old.paid_from_spot;   -- unchanged
    end if;

    if new.paid_from_spot and new.spot_then is not null then
      new.paid := round(public.fine_oz(new) * new.spot_then, 2);
    end if;
  end if;
  return new;
end $$;

-- Check: should say "Editing is ready"
select case when position('paid_from_spot := false' in pg_get_functiondef('public.lock_purchase_fields'::regproc)) > 0
            then 'Editing is ready' else 'Not updated yet' end as status;
