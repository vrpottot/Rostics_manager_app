-- Регистрация: signUp -> создаём ресторан + профиль (данные из user_metadata).
-- Удаление профиля -> удаляем ресторан, если в нём не осталось менеджеров.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  insert into public.restaurants (name)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), ''), 'Мой ресторан')
  )
  returning id into rid;

  insert into public.profiles (id, restaurant_id, name)
  values (
    new.id,
    rid,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_profile_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.restaurants r
  where r.id = old.restaurant_id
    and not exists (select 1 from public.profiles p where p.restaurant_id = r.id);
  return old;
end;
$$;

drop trigger if exists on_profile_deleted on public.profiles;
create trigger on_profile_deleted
  after delete on public.profiles
  for each row execute function private.handle_profile_deleted();
