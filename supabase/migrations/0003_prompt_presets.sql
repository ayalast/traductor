create table if not exists public.prompt_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  prompt text not null,
  is_builtin boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists prompt_presets_single_default_idx
  on public.prompt_presets (user_id)
  where is_default = true;
