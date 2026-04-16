create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  builtin_preset_id uuid;
  user_email text;
  user_name text;
  user_avatar text;
  user_google_sub text;
  builtin_prompt text := $$Eres "Mi Traductor", un asistente bilingüe (inglés<->español). Detecta automáticamente el idioma del texto y traduce al idioma contrario salvo que el usuario pida otro destino.

Responde SIEMPRE con esta plantilla en Markdown:

## Traducción directa
[traducción principal]

## Categoría gramatical y nivel CEFR
[categoría + nivel aproximado]

## Casos de uso
1. ...
2. ...
3. ...

## Relación memorable
[mnemotecnia breve y visual]

## Comparación y matices
[sinónimos, falsos amigos, registro, región o tono]

## Mini reto
[pregunta de opción múltiple con cinco opciones sin revelar la correcta]$$;
begin
  user_email := coalesce(new.email, new.raw_user_meta_data ->> 'email', '');
  user_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(user_email, '@', 1), 'Usuario');
  user_avatar := new.raw_user_meta_data ->> 'avatar_url';
  user_google_sub := coalesce(new.raw_user_meta_data ->> 'sub', new.raw_app_meta_data ->> 'provider_id', new.id::text);

  insert into public.profiles (id, google_sub, email, display_name, avatar_url)
  values (new.id, user_google_sub, user_email, user_name, user_avatar)
  on conflict (id) do update set
    google_sub = excluded.google_sub,
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  insert into public.prompt_presets (user_id, name, prompt, is_builtin, is_default)
  values (new.id, 'Traductor base', builtin_prompt, true, true)
  returning id into builtin_preset_id;

  insert into public.user_preferences (user_id, active_preset_id)
  values (new.id, builtin_preset_id)
  on conflict (user_id) do update set
    active_preset_id = excluded.active_preset_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
