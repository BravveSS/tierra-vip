-- ============================================================================
-- TA LABS — Esquema de Supabase
-- Ejecutar una vez en el SQL Editor del proyecto de Supabase.
-- ============================================================================

-- Leads de la calculadora de presupuesto
create table if not exists public.ta_leads (
  id               bigint generated always as identity primary key,
  creado           timestamptz not null default now(),
  nombre           text not null,
  email            text not null,
  nota             text,
  tipo             text,
  funcionalidades  text[],
  integraciones    text[],
  rango_min        integer,
  rango_max        integer,
  origen           text default 'calculadora'
);

create index if not exists ta_leads_creado_idx on public.ta_leads (creado desc);

-- Reuniones agendadas
create table if not exists public.ta_reuniones (
  id       bigint generated always as identity primary key,
  creado   timestamptz not null default now(),
  nombre   text not null,
  email    text not null,
  nota     text,
  fecha    date not null,
  hora     text not null,
  zona     text,
  estado   text not null default 'solicitada'
);

create index if not exists ta_reuniones_fecha_idx on public.ta_reuniones (fecha, hora);

-- ── Seguridad ───────────────────────────────────────────────────────────────
-- RLS activo y SIN políticas: nadie puede leer ni escribir con la clave
-- pública. Las funciones de /api usan la service key, que salta RLS por
-- diseño. Así, aunque alguien saque la clave pública del navegador, no puede
-- listar los leads ni las reuniones de nadie.
alter table public.ta_leads     enable row level security;
alter table public.ta_reuniones enable row level security;
