-- Money Tracker — migration 003: external sync (Wise/Bybit) + CSV import.
-- Adds source+external_id to transactions (dedup), creates api_integrations.
-- Also relaxes user_settings.currencies min from 2 → 1.

-- ---------------------------------------------------------------------------
-- transactions: dedup metadata for imported rows
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists source      text not null default 'manual',
  add column if not exists external_id text;

create unique index if not exists transactions_source_external_id_uniq
  on public.transactions (user_id, source, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- user_settings: relax currencies constraint (1+ instead of 2+)
-- ---------------------------------------------------------------------------
alter table public.user_settings
  drop constraint if exists user_settings_currencies_check;

alter table public.user_settings
  add constraint user_settings_currencies_check
  check (coalesce(array_length(currencies, 1), 0) >= 1);

-- ---------------------------------------------------------------------------
-- api_integrations — provider credentials + sync cursor, one row per (user, provider)
-- ---------------------------------------------------------------------------
create table if not exists public.api_integrations (
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        text not null check (provider in ('wise', 'bybit')),
  api_key         text not null,
  api_secret      text,
  extra           jsonb not null default '{}'::jsonb,
  import_income   boolean not null default false,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, provider)
);

drop trigger if exists api_integrations_set_updated_at on public.api_integrations;
create trigger api_integrations_set_updated_at
  before update on public.api_integrations
  for each row execute function public.set_updated_at();

alter table public.api_integrations enable row level security;

drop policy if exists api_integrations_all_own on public.api_integrations;
create policy api_integrations_all_own on public.api_integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
