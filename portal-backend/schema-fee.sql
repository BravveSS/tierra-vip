-- ============================================================================
-- TIERRA — Fee de Tierra por obra (idempotente; pegar en Supabase → SQL Editor)
-- "Invertido en tu obra" = costo de obra + fee.
--   fee_type 'pct'   → fee_value es un % sobre el costo de obra (ej. 15)
--   fee_type 'fixed' → fee_value es un monto fijo en MXN
-- ============================================================================
alter table public.projects add column if not exists fee_type text default 'pct';
alter table public.projects add column if not exists fee_value numeric default 0;
do $$ begin
  alter table public.projects add constraint projects_fee_type_chk check (fee_type in ('pct','fixed'));
exception when duplicate_object then null; end $$;
