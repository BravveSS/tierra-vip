-- ============================================================================
-- TIERRA — Portal de Avance de Obra · Esquema + Seguridad (Supabase / Postgres)
-- Pega TODO este archivo en:  Supabase → SQL Editor → New query → Run
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- ── Extensiones ──
create extension if not exists pgcrypto;

-- ── ALLOWLIST DE ADMINS ───────────────────────────────────────────────────
-- Quién puede entrar al panel. Los 2 correos de Tomás son 'superadmin'.
-- Un superadmin puede agregar más correos (admin) desde el panel.
create table if not exists public.admin_allowlist (
  email text primary key,
  role  text not null default 'admin' check (role in ('admin','superadmin')),
  created_at timestamptz default now()
);

-- Seed de superadmins (los únicos que pueden gestionar admins)
insert into public.admin_allowlist (email, role) values
  ('tomasattanzioc@gmail.com', 'superadmin'),
  ('e.attanzio@gmail.com',     'superadmin')
on conflict (email) do update set role = excluded.role;

-- ── PROYECTOS (una obra por cliente) ──────────────────────────────────────
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,               -- "Casa Yuu'Kee — Familia López"
  client_name text,
  location   text,                          -- "La Boquilla, Oaxaca"
  status     text default 'en_progreso',   -- en_progreso | entregada | pausada
  created_at timestamptz default now()
);

-- ── PERFILES (un registro por usuario autenticado) ────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'client' check (role in ('client','admin','superadmin')),
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz default now()
);

-- ── AVANCES (cada publicación de avance de obra) ──────────────────────────
create table if not exists public.updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date       date not null default current_date,
  title      text,
  note       text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
create index if not exists updates_project_idx on public.updates(project_id, date desc);

-- ── FOTOS DE CADA AVANCE ──────────────────────────────────────────────────
create table if not exists public.update_photos (
  id           uuid primary key default gen_random_uuid(),
  update_id    uuid not null references public.updates(id) on delete cascade,
  storage_path text not null,               -- 'obra/<project_id>/<archivo>.webp'
  sort         int default 0,
  created_at   timestamptz default now()
);
create index if not exists photos_update_idx on public.update_photos(update_id, sort);

-- ── FUNCIONES DE ROL (security definer → evitan recursión en las políticas) ─
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','superadmin'));
$$;

create or replace function public.is_superadmin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin');
$$;

create or replace function public.my_project_id() returns uuid
  language sql security definer stable set search_path = public as $$
  select project_id from public.profiles where id = auth.uid();
$$;

-- ── TRIGGER: al registrarse un usuario, crear su perfil ───────────────────
-- El rol sale de la allowlist (admin/superadmin) o 'client' por defecto.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce((select role from public.admin_allowlist where lower(email) = lower(new.email)), 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.projects         enable row level security;
alter table public.updates          enable row level security;
alter table public.update_photos    enable row level security;
alter table public.admin_allowlist  enable row level security;

-- limpia políticas previas (idempotente)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
           where schemaname='public'
             and tablename in ('profiles','projects','updates','update_photos','admin_allowlist')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- PROFILES: cada quien ve su perfil; admins ven todos; solo superadmin cambia roles
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self_name on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_manage on public.profiles for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- PROJECTS: el cliente ve solo su obra; admins gestionan todo
create policy projects_select on public.projects for select
  using (public.is_admin() or id = public.my_project_id());
create policy projects_admin_write on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

-- UPDATES: el cliente lee solo los de su obra; admins escriben
create policy updates_select on public.updates for select
  using (public.is_admin() or project_id = public.my_project_id());
create policy updates_admin_write on public.updates for all
  using (public.is_admin()) with check (public.is_admin());

-- UPDATE_PHOTOS: mismo aislamiento vía el avance padre
create policy photos_select on public.update_photos for select
  using (public.is_admin() or exists(
    select 1 from public.updates u
    where u.id = update_id and u.project_id = public.my_project_id()));
create policy photos_admin_write on public.update_photos for all
  using (public.is_admin()) with check (public.is_admin());

-- ADMIN_ALLOWLIST: solo superadmins la ven/gestionan
create policy allowlist_superadmin on public.admin_allowlist for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- ── STORAGE: bucket privado 'obra' ────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('obra','obra', false)
  on conflict (id) do nothing;

-- limpia policies de storage previas de este bucket
do $$ declare r record; begin
  for r in select policyname from pg_policies
           where schemaname='storage' and tablename='objects'
             and policyname like 'obra_%'
  loop execute format('drop policy if exists %I on storage.objects', r.policyname); end loop;
end $$;

-- Admin: sube/borra cualquier foto del bucket obra
create policy obra_admin_all on storage.objects for all
  using (bucket_id = 'obra' and public.is_admin())
  with check (bucket_id = 'obra' and public.is_admin());

-- Cliente: solo LEE fotos cuya carpeta = su project_id  (obra/<project_id>/...)
create policy obra_client_read on storage.objects for select
  using (
    bucket_id = 'obra'
    and (storage.foldername(name))[1] = public.my_project_id()::text
  );

-- ============================================================================
-- LISTO. Después de correr esto:
--  1) Entra a la web /admin con tu Google → ya serás superadmin.
--  2) Crea un proyecto, crea la cuenta del cliente y sube el primer avance.
-- ============================================================================
