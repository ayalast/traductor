alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.prompt_presets enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "user_preferences_all_own"
  on public.user_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prompt_presets_all_own"
  on public.prompt_presets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "provider_credentials_all_own"
  on public.provider_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations_all_own"
  on public.conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "messages_read_own"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_insert_own"
  on public.messages
  for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on public.messages
  for update
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_delete_own"
  on public.messages
  for delete
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );
