-- ============================================================================
-- TIERRA — Dashboard v3 · TODO EN UNO (pegar completo en Supabase → SQL Editor)
-- Es idempotente: se puede correr varias veces sin romper nada.
-- 1) Tablas de costos + presupuesto + RLS   2) Semana 77 de ejemplo en la demo
-- ============================================================================

alter table public.projects add column if not exists budget_total numeric;

create table if not exists public.cost_weeks (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_label text not null,               -- "Semana 77"
  date_from  date,
  date_to    date,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
create index if not exists cost_weeks_project_idx on public.cost_weeks(project_id, created_at desc);

create table if not exists public.cost_items (
  id       uuid primary key default gen_random_uuid(),
  week_id  uuid not null references public.cost_weeks(id) on delete cascade,
  concept  text not null,                 -- "4 Maestros"
  amount   numeric not null default 0,    -- 23200
  sort     int default 0
);
create index if not exists cost_items_week_idx on public.cost_items(week_id, sort);

alter table public.cost_weeks enable row level security;
alter table public.cost_items enable row level security;

do $blk$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname='public' and tablename in ('cost_weeks','cost_items')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $blk$;

-- Cliente: solo lee los costos de SU obra. Admin: todo.
create policy cw_select on public.cost_weeks for select
  using (public.is_admin() or project_id = public.my_project_id());
create policy cw_admin_write on public.cost_weeks for all
  using (public.is_admin()) with check (public.is_admin());

create policy ci_select on public.cost_items for select
  using (public.is_admin() or exists(
    select 1 from public.cost_weeks w
    where w.id = week_id and w.project_id = public.my_project_id()));
create policy ci_admin_write on public.cost_items for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Semana 77 (06–12 jul) en la obra demo "Casa Yuu'Kee — Obra Demo"
-- ============================================================================
do $seed$
declare
  pid uuid := 'd7db4493-39c0-4e25-b762-b51cd7b85ec2';
  wid uuid;
begin
  if not exists (select 1 from public.projects where id = pid) then return; end if;

  delete from public.cost_weeks where project_id = pid and week_label = 'Semana 77';

  insert into public.cost_weeks (project_id, week_label, date_from, date_to)
  values (pid, 'Semana 77', '2026-07-06', '2026-07-12')
  returning id into wid;

  insert into public.cost_items (week_id, concept, amount, sort) values
    (wid, '4 Maestros',                        23200,  1),
    (wid, '3 Ayudantes',                       10350,  2),
    (wid, 'Electricidad y plomería',            9250,  3),
    (wid, 'Jefe de obra',                       1850,  4),
    (wid, 'Supervisor de obra',                 1800,  5),
    (wid, 'Administración',                     1080,  6),
    (wid, 'Dirección de obra',                  3000,  7),
    (wid, 'Prestaciones y cuotas patronales',   5053,  8),
    (wid, 'Transporte y gasolina',              1000,  9),
    (wid, '2 pago luz',                        30000, 10),
    (wid, 'Berel impermeabilizante',            5085, 11),
    (wid, 'Dimmer',                             3616, 12),
    (wid, 'Luces cortesía',                     2761, 13),
    (wid, 'Boiler',                             7587, 14),
    (wid, 'Platos y brazos regadera',           3145, 15),
    (wid, 'Gastos menores',                     4010, 16);
  -- Total: $112,787

  -- Presupuesto de ejemplo para la demo (solo si no tiene uno ya)
  update public.projects set budget_total = coalesce(budget_total, 2500000)
  where id = pid;
end $seed$;
