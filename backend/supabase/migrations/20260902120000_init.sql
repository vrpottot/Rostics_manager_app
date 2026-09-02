-- Ростикс Менеджер — базовая схема
-- Применяется к self-hosted Supabase (Postgres 15).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────── рестораны и профили

create table public.restaurants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- профиль менеджера привязан к auth.users (Supabase Auth)
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  position      text,
  created_at    timestamptz not null default now()
);
create index profiles_restaurant_idx on public.profiles (restaurant_id);

-- ─────────────────────────────────────────── сотрудники ресторана

create type public.employee_role as enum ('manager', 'shift', 'trainee', 'crew');

create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  role          public.employee_role not null default 'crew',
  phone         text,
  color         text not null,
  created_at    timestamptz not null default now()
);
create index employees_restaurant_idx on public.employees (restaurant_id);

-- ─────────────────────────────────────────── смены сотрудников

create table public.shifts (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id   uuid not null references public.employees (id) on delete cascade,
  work_date     date not null,
  start_time    text not null,   -- 'HH:MM'
  end_time      text not null,   -- 'HH:MM' (допустимо '24:00' для смен «до полуночи»)
  position      text,
  note          text,
  created_at    timestamptz not null default now()
);
create index shifts_restaurant_date_idx on public.shifts (restaurant_id, work_date);

-- ─────────────────────────────────────────── задачи

create type public.task_category as enum ('shift', 'opening', 'closing', 'product');
create type public.task_priority as enum ('low', 'med', 'high');
create type public.task_status   as enum ('open', 'in_progress', 'done');

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category      public.task_category not null default 'shift',
  title         text not null,
  description   text,
  assignee_id   uuid references public.employees (id) on delete set null,
  due_date      date,
  priority      public.task_priority not null default 'med',
  status        public.task_status not null default 'open',
  sort_order    integer,          -- порядок пунктов в чек-листах открытия/закрытия
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index tasks_restaurant_category_idx on public.tasks (restaurant_id, category);

-- отметки выполнения ежедневных чек-листов (открытие / закрытие) по датам
create table public.daily_checks (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  task_id       uuid not null references public.tasks (id) on delete cascade,
  check_date    date not null,
  done_at       timestamptz not null default now(),
  done_by       uuid references public.profiles (id) on delete set null,
  primary key (task_id, check_date)
);
create index daily_checks_restaurant_date_idx on public.daily_checks (restaurant_id, check_date);

-- ─────────────────────────────────────────── личный график менеджера

create type public.manager_shift_type as enum ('morning', 'day', 'evening');

create table public.manager_schedule (
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  work_date     date not null,
  shift_type    public.manager_shift_type not null,
  primary key (profile_id, work_date)
);
