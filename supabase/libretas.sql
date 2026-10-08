-- Módulo de Libretas — ejecutar una sola vez en Supabase > SQL Editor.
-- El acceso lo hace siempre el backend con la service role key; RLS queda activo sin políticas.

create extension if not exists pgcrypto;

create table if not exists public.lib_alumnos (
  id uuid primary key default gen_random_uuid(),
  anio_lectivo integer not null,
  nivel text not null check (nivel in ('Inicial', 'Primario', 'Secundario')),
  curso text not null,
  apellido text not null,
  nombre text not null,
  dni text,
  created_at timestamptz not null default now(),
  created_by uuid,
  created_by_name text,
  updated_at timestamptz,
  updated_by uuid,
  updated_by_name text
);

create index if not exists lib_alumnos_curso_idx
  on public.lib_alumnos (anio_lectivo, nivel, curso);

create table if not exists public.lib_notas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.lib_alumnos (id) on delete cascade,
  clave text not null,
  datos jsonb not null default '{}'::jsonb,
  calculado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_name text,
  unique (alumno_id, clave)
);

create index if not exists lib_notas_alumno_idx on public.lib_notas (alumno_id);

alter table public.lib_alumnos enable row level security;
alter table public.lib_notas enable row level security;

-- Datos por curso (docentes y firmas) para las libretas de Primaria e Inicial.
create table if not exists public.lib_cursos_config (
  id uuid primary key default gen_random_uuid(),
  anio_lectivo integer not null,
  nivel text not null check (nivel in ('Inicial', 'Primario', 'Secundario')),
  curso text not null,
  datos jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_name text,
  unique (anio_lectivo, nivel, curso)
);

alter table public.lib_cursos_config enable row level security;

-- Materias asignadas a cada docente (qué planillas ve y puede cargar).
create table if not exists public.lib_asignaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nivel text not null check (nivel in ('Inicial', 'Primario', 'Secundario')),
  curso text not null,
  clave text not null,
  created_at timestamptz not null default now(),
  unique (user_id, nivel, curso, clave)
);

create index if not exists lib_asignaciones_user_idx on public.lib_asignaciones (user_id);

alter table public.lib_asignaciones enable row level security;
