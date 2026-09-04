# Бэкенд — Supabase

Postgres + Auth + авто-REST для приложения «Ростикс Менеджер».

**Сейчас:** Supabase Cloud, проект `KFC` (ref `oltxockenofawscbsczx`, регион eu-west-1).
Схема из `supabase/migrations/` уже применена. Для разработки/MVP этого достаточно.

**Для прод:** ПДн сотрудников по 152-ФЗ должны храниться на серверах в РФ →
позже разворачиваем self-hosted Supabase на VPS в РФ (шаги ниже) и прогоняем
те же миграции через `supabase db push`.

```
backend/
  supabase/
    config.toml          # конфиг Supabase CLI
    migrations/           # SQL-миграции (применяются по порядку)
      20260902120000_init.sql       — таблицы
      20260902120100_rls.sql        — Row Level Security
      20260902120200_register.sql   — триггер регистрации
      20260902120300_manager_schedule_times.sql — точные часы смены (импорт из Excel)
```

> ⚠️ Миграцию `…120300…` нужно применить к облачному проекту (Studio → SQL Editor
> или `supabase db push`), иначе импорт графика из Excel упадёт на неизвестных
> колонках `start_time` / `end_time`.

---

## 1. Локальная разработка (по желанию, до деплоя)

Нужен Docker.

```bash
npm i -g supabase          # Supabase CLI
cd backend
supabase start             # поднимает локальный Supabase, применяет миграции
```

CLI напечатает `API URL`, `anon key`, `service_role key`, `Studio URL`.
Их кладём в `rostics-manager/.env` (см. `.env.example`).

Остановить: `supabase stop`.

---

## 2. Деплой на VPS (Ubuntu 22.04+)

### 2.1. Поднять Supabase

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

В `.env` обязательно задать свои значения:

| Переменная | Что это |
|---|---|
| `POSTGRES_PASSWORD` | пароль БД (длинный, случайный) |
| `JWT_SECRET` | 40+ случайных символов |
| `ANON_KEY`, `SERVICE_ROLE_KEY` | сгенерировать под `JWT_SECRET` на https://supabase.com/docs/guides/self-hosting#api-keys |
| `SITE_URL` | `rostics://` (deep link приложения) |
| `API_EXTERNAL_URL` | `https://api.твойдомен.ru` |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | вход в Studio |
| `ENABLE_EMAIL_AUTOCONFIRM` | `true` (вход сразу после регистрации) |
| `SMTP_*` | можно позже, для писем восстановления пароля |

```bash
docker compose up -d
```

### 2.2. Nginx + TLS

Проксируем `https://api.твойдомен.ru` → `http://localhost:8000` (Kong).
Сертификат — `certbot`. Наружу открыть только 443; порт Studio (`3000`) —
за basic-auth или доступен только по VPN/SSH-туннелю.

### 2.3. Firewall

```bash
ufw allow 22/tcp && ufw allow 443/tcp && ufw enable
```

---

## 3. Применить миграции

С машины разработки, указывая прямое подключение к БД на VPS
(порт 5432 доступен только с localhost VPS → через SSH-туннель):

```bash
ssh -L 5432:localhost:5432 user@vps        # в отдельном терминале
cd backend
supabase db push --db-url "postgresql://postgres:PASSWORD@localhost:5432/postgres"
```

Либо просто прогнать SQL-файлы по порядку через `psql`.

Проверка: Studio → Table editor → должны появиться таблицы
`restaurants, profiles, employees, shifts, tasks, daily_checks, manager_schedule`,
у всех включён RLS.

---

## 4. Настроить приложение

В `rostics-manager/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://api.твойдомен.ru
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY из .env Supabase>
```

`anon key` — публичный, его безопасно держать в приложении: доступ к данным
ограничивает RLS, а не секретность ключа. `SERVICE_ROLE_KEY` в приложение
**никогда** не кладём.

---

## Дальнейшие шаги в приложении

1. `src/lib/supabase.ts` — клиент (готов).
2. Переписать `src/store.tsx`: auth → `supabase.auth.*`, данные → запросы к
   таблицам через TanStack Query. Интерфейс хука `useStore()` сохраняем 1:1,
   экраны не трогаем.
3. Экраны loading / ошибки сети (спиннер + «повторить»).
4. Позже: realtime-подписки, push-уведомления, фото.
