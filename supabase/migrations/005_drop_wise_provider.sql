-- Money Tracker — migration 005: remove Wise from api_integrations.
-- The Wise public API isn't usable from personal accounts (Business only in
-- production), so we drop the adapter and constraint value. CSV import remains.

delete from api_integrations where provider = 'wise';

alter table api_integrations
  drop constraint api_integrations_provider_check;

alter table api_integrations
  add constraint api_integrations_provider_check check (provider in ('bybit'));
