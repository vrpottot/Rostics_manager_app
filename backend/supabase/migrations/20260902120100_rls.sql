-- Row Level Security: менеджер видит и меняет только данные своего ресторана.
-- Хелпер-функции лежат в схеме private (не отдаётся через PostgREST).

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;
grant execute on function private.current_restaurant_id() to anon, authenticated;

alter table public.restaurants      enable row level security;
alter table public.profiles         enable row level security;
alter table public.employees        enable row level security;
alter table public.shifts           enable row level security;
alter table public.tasks            enable row level security;
alter table public.daily_checks     enable row level security;
alter table public.manager_schedule enable row level security;

-- ─── restaurants: свой ресторан (чтение + переименование)
create policy restaurants_select on public.restaurants
  for select using (id = private.current_restaurant_id());
create policy restaurants_update on public.restaurants
  for update using (id = private.current_restaurant_id());

-- ─── profiles: только своя запись
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- ─── справочники ресторана: полный CRUD в пределах своего ресторана
create policy employees_all on public.employees
  for all using (restaurant_id = private.current_restaurant_id())
  with check (restaurant_id = private.current_restaurant_id());

create policy shifts_all on public.shifts
  for all using (restaurant_id = private.current_restaurant_id())
  with check (restaurant_id = private.current_restaurant_id());

create policy tasks_all on public.tasks
  for all using (restaurant_id = private.current_restaurant_id())
  with check (restaurant_id = private.current_restaurant_id());

create policy daily_checks_all on public.daily_checks
  for all using (restaurant_id = private.current_restaurant_id())
  with check (restaurant_id = private.current_restaurant_id());

-- ─── личный график: только свой
create policy manager_schedule_all on public.manager_schedule
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
