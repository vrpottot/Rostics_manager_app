# Сборка APK (бесплатно)

## Что уже «выложено»

**Бэкенд** — Supabase Cloud (проект KFC), free tier. Отдельно ничего разворачивать
не нужно: собранный APK ходит прямо в него.
Ограничения free: БД 500 МБ, до 50 000 активных пользователей/мес, проект
**засыпает после 7 дней без активности** (любой вход будит; позже — платный план
или self-host в РФ).

Metro/`expo start` нужен только для разработки. В APK весь JS уже упакован.

## APK через EAS Build (облачная сборка, free)

Free-тариф EAS: ~30 Android-сборок в месяц, очередь бывает медленной (10–30 мин).

```bash
# 1. аккаунт Expo (бесплатный) — expo.dev, затем:
npm i -g eas-cli
eas login

# 2. привязать проект (создаст projectId в app.json)
cd rostics-manager
eas init

# 3. собрать APK
eas build -p android --profile preview
```

По готовности EAS даст ссылку — скачиваешь `.apk`, кидаешь на телефон,
ставишь (Настройки → разрешить установку из этого источника).

Профиль `preview` в [eas.json](eas.json) уже настроен: `buildType: apk`,
переменные Supabase проброшены (anon-ключ публичный, защищён RLS).

## Обновления без пересборки APK (EAS Update, free)

Правки в JS/TS можно доставлять по воздуху, не собирая новый APK:

```bash
npx expo install expo-updates
eas update:configure
eas update --branch preview -m "что изменил"
```

Пересборка APK нужна только при смене нативной части (новые нативные модули,
иконка, `app.json` native-поля).

## Альтернатива: локальная сборка (без очереди, нужен Android Studio + JDK 17)

```bash
eas build -p android --profile preview --local
```

или классический путь: `npx expo prebuild -p android` → `cd android && ./gradlew assembleRelease`
(APK в `android/app/build/outputs/apk/release/`).
