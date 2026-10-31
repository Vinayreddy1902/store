-- Only service-role edge functions may write verified payment entitlements.
create table if not exists public.products (
 id text primary key, price_usd_cents integer not null check(price_usd_cents > 0),
 paypal_enabled boolean not null default false
);
-- Populate products and verified prices manually before enabling checkout.
-- No default price is assumed for any product.

create table if not exists public.checkout_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null references public.products(id),
 paypal_order_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','failed')),
 created_at timestamptz not null default now()
);
create table if not exists public.entitlements (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null,
 provider text not null check(provider in ('paypal','google_play')),
 provider_transaction_id text not null unique,
 expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(user_id, product_id, provider_transaction_id)
);
create table if not exists public.payment_events (
 provider text not null,
 event_id text not null,
 created_at timestamptz not null default now(),
 primary key(provider,event_id)
);
alter table public.products enable row level security;
alter table public.checkout_orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.checkout_orders, public.entitlements, public.payment_events from anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.entitlements to authenticated;
create policy "Read active own entitlements" on public.entitlements for select to authenticated
using (user_id = (select auth.uid()) and revoked_at is null and (expires_at is null or expires_at > now()));
create policy "Read published products" on public.products for select to anon, authenticated using (paypal_enabled);
insert into storage.buckets (id,name,public,file_size_limit)
values ('paid-products','paid-products',false,52428800)
on conflict(id) do update set public=false;
-- No storage.objects SELECT policy: clients cannot list or read private files directly.
-- Only edge functions with service role issue short-lived signed URLs after entitlement checks.

-- Insert product definitions for trading suite, clipstudio suite, and momentum pro
insert into public.products(id, price_usd_cents, paypal_enabled)
values 
  ('ai_trading_bot_team', 4900, true),
  ('ai_clipstudio_suite', 3900, true),
  ('momentum_pro_monthly', 399, false),
  ('momentum_pro_annual', 2999, false)
on conflict (id) do update set price_usd_cents = excluded.price_usd_cents;
