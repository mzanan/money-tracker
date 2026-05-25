-- Money Tracker — schema inicial
-- Tablas: transactions, user_settings, fx_rates_cache + trigger updated_at.
-- Las policies de RLS van en 002_rls_policies.sql.

-- ---------------------------------------------------------------------------
-- transactions
-- Cada fila guarda el monto en su moneda original + un snapshot del mapa de
-- tasas (USD-based) al momento de cargar, para poder mostrar la transaccion en
-- cualquier moneda de display a tasa de entrada sin drift historico.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  kind              text not null check (kind in ('income', 'expense')),
  amount_original   numeric(18, 4) not null check (amount_original > 0),
  currency_original text not null,
  -- mapa USD-based de tasas al momento de cargar, ej: {"USD":1,"VND":25400,"EUR":0.92}
  fx_rates_snapshot jsonb not null,
  category          text,
  note              text,
  -- dia calendario asignado a la transaccion (huso local del dispositivo al cargar).
  -- es una etiqueta absoluta: no se re-mapea aunque el usuario viaje.
  occurred_on       date not null,
  -- instante preciso de creacion, solo para desempatar orden dentro de un dia.
  occurred_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_on desc, occurred_at desc);

create index if not exists transactions_user_kind_idx
  on public.transactions (user_id, kind);

-- ---------------------------------------------------------------------------
-- user_settings — una fila por usuario
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  -- monedas elegidas por el usuario (>= 2). codigos ISO 4217.
  currencies    text[] not null check (coalesce(array_length(currencies, 1), 0) >= 2),
  -- moneda base / de display por defecto.
  base_currency text not null,
  -- override opcional de huso horario. null = usar el auto-detectado del dispositivo.
  timezone      text,
  -- null = onboarding incompleto (el gate de rutas lo chequea).
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- fx_rates_cache — cache compartida (no por usuario) de la API de tasas.
-- open.er-api.com siempre devuelve tasas USD-based, asi que base = 'USD'.
-- ---------------------------------------------------------------------------
create table if not exists public.fx_rates_cache (
  base                text primary key,
  rates               jsonb not null,
  fetched_at          timestamptz not null default now(),
  provider_updated_at timestamptz,
  next_update_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- trigger updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();
