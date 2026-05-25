-- Money Tracker — Row Level Security
-- Es el borde de seguridad de un deploy publico: sin esto, la anon key expone
-- todos los datos. Cada usuario solo ve/edita sus propias filas.

-- ---------------------------------------------------------------------------
-- transactions — privado por usuario
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_settings — privado por usuario (el delete lo cubre el cascade)
-- ---------------------------------------------------------------------------
alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- fx_rates_cache — cache compartida no sensible. Cualquier usuario autenticado
-- puede leerla y refrescarla (upsert). Nada de acceso anonimo.
-- ---------------------------------------------------------------------------
alter table public.fx_rates_cache enable row level security;

drop policy if exists fx_rates_select_authenticated on public.fx_rates_cache;
create policy fx_rates_select_authenticated on public.fx_rates_cache
  for select to authenticated
  using (true);

drop policy if exists fx_rates_insert_authenticated on public.fx_rates_cache;
create policy fx_rates_insert_authenticated on public.fx_rates_cache
  for insert to authenticated
  with check (true);

drop policy if exists fx_rates_update_authenticated on public.fx_rates_cache;
create policy fx_rates_update_authenticated on public.fx_rates_cache
  for update to authenticated
  using (true)
  with check (true);
