-- Money Tracker — migration 004: replace partial unique index with full unique
-- constraint so supabase-js upsert ON CONFLICT can target it. NULL external_id
-- (manual rows) is still distinct from any other NULL, so behavior is unchanged.

drop index if exists public.transactions_source_external_id_uniq;

alter table public.transactions
  drop constraint if exists transactions_source_external_id_uniq;

alter table public.transactions
  add constraint transactions_source_external_id_uniq
  unique (user_id, source, external_id);
