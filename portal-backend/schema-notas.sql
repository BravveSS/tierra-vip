-- ============================================================================
-- TIERRA — Portal v4: notas de construcción + % de avance (idempotente)
-- ============================================================================

alter table public.projects add column if not exists progress int default 0;

create table if not exists public.project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note_date  date default current_date,
  title      text,
  body       text not null,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
create index if not exists project_notes_idx on public.project_notes(project_id, note_date desc, created_at desc);

alter table public.project_notes enable row level security;

do $blk$ declare r record; begin
  for r in select policyname from pg_policies
    where schemaname='public' and tablename='project_notes'
  loop execute format('drop policy if exists %I on public.project_notes', r.policyname); end loop;
end $blk$;

-- Cliente: solo lee las notas de SU obra. Admin: todo.
create policy pn_select on public.project_notes for select
  using (public.is_admin() or project_id = public.my_project_id());
create policy pn_admin_write on public.project_notes for all
  using (public.is_admin()) with check (public.is_admin());
