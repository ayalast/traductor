create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nuevo chat',
  provider text not null check (provider in ('groq', 'deepseek', 'openrouter')),
  model text not null,
  temperature numeric not null default 0.5 check (temperature >= 0 and temperature <= 1),
  preset_id uuid not null references public.prompt_presets (id) on delete restrict,
  archived boolean not null default false,
  parent_conversation_id uuid references public.conversations (id) on delete set null,
  branch_from_message_id uuid,
  branch_depth integer not null default 0 check (branch_depth >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  turn_index integer not null,
  status text not null default 'complete' check (status in ('complete', 'partial', 'error')),
  reasoning_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);
