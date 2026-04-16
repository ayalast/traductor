create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  google_sub text unique not null,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  active_provider text not null default 'groq' check (active_provider in ('groq', 'deepseek', 'openrouter')),
  active_model_groq text,
  active_model_deepseek text,
  active_model_openrouter text,
  active_temperature numeric not null default 0.5 check (active_temperature >= 0 and active_temperature <= 1),
  active_preset_id uuid,
  notes text not null default '',
  theme_id text not null default 'ember',
  theme_mode text not null default 'dark',
  paper_texture_enabled boolean not null default false,
  paper_texture_level integer not null default 0 check (paper_texture_level >= 0 and paper_texture_level <= 100),
  paper_texture_global_enabled boolean not null default false,
  paper_texture_global_level integer not null default 0 check (paper_texture_global_level >= 0 and paper_texture_global_level <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
