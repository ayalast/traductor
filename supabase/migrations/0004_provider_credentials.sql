create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('groq', 'deepseek', 'openrouter')),
  encrypted_key text not null,
  iv text not null,
  algorithm text not null default 'AES-GCM',
  key_hint text not null,
  validation_status text not null default 'unknown' check (validation_status in ('unknown', 'valid', 'invalid')),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
