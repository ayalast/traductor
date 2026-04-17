-- Migration: Add parent_message_id to messages to support branching/siblings
alter table public.messages
  add column if not exists parent_message_id uuid references public.messages (id) on delete cascade;

-- Index for performance
create index if not exists messages_parent_id_idx on public.messages (parent_message_id);

-- Update RLS if needed (already broad enough usually)
