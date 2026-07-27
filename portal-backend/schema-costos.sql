-- ============================================================================
-- TIERRA — Portal v3: costos semanales + presupuesto (idempotente)
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
