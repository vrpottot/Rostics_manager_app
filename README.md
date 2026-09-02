# Ростикс Менеджер

Мобильное приложение для менеджера ресторана: задачи (смена / открытие / закрытие /
продукт), чек-листы открытия и закрытия по дням, график смен, команда, личный
график менеджера, светлая/тёмная тема.

```
rostics-manager/   — приложение (Expo / React Native / TypeScript)
backend/           — схема БД (Supabase: миграции + рунбук деплоя)
```

## Стек

- **Клиент:** Expo SDK 57, React Native, TypeScript, React Navigation,
  TanStack Query, Manrope + Golos Text.
- **Бэкенд:** Supabase (Postgres + Auth + авто-REST), RLS по `restaurant_id`.
  Схема — `backend/supabase/migrations/`.

## Запуск приложения

```bash
cd rostics-manager
npm install
cp .env.example .env        # вписать EXPO_PUBLIC_SUPABASE_URL / ANON_KEY
npx expo start
```

Открыть в Expo Go (Android/iOS) или `w` для веба.

## Сборка APK

`cp eas.json.example eas.json` (вписать ключи), затем см. `rostics-manager/BUILD.md`.

## Бэкенд

Схема уже применена к облачному проекту Supabase. Для нового окружения /
self-host — см. `backend/README.md`.
