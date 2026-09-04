export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * Диалог подтверждения, работающий и на web (там Alert с кнопками из
 * react-native-web не срабатывает — колбэки кнопок не вызываются).
 */
export function confirmAsync(
  title: string,
  message?: string,
  confirmLabel = 'ОК',
  destructive = false
): Promise<boolean> {
  // require здесь, чтобы utils.ts оставался без импорта RN
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Alert, Platform } = require('react-native');
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window === 'undefined'
        ? true
        : window.confirm(message ? `${title}\n\n${message}` : title)
    );
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export const todayISO = () => toISODate(new Date());

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MON = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function weekdayShort(iso: string): string {
  return WD[fromISODate(iso).getDay()];
}

export function humanDate(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Mon=0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Duration in hours between HH:mm strings; handles overnight shifts. */
export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (s: string) => TIME_RE.test(s.trim());

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (s: string) => EMAIL_RE.test(s.trim());

/**
 * Небольшой синхронный хэш (djb2). Это МОК для локальной версии —
 * при переходе на бэкенд заменить на bcrypt/argon2 на сервере.
 */
export function hashPassword(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}
