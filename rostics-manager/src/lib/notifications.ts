import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ManagerSchedule } from '../types';
import { ordersDueOn } from '../orderSchedule';
import { addDays, fromISODate, toISODate } from '../utils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** За сколько минут до начала смены напоминать. */
const SHIFT_REMINDER_MINUTES = 60;
/** В какое время дня напоминать о заказах поставщикам. */
const ORDER_REMINDER_HOUR = 9;
const ORDER_REMINDER_MINUTE = 0;
/** На сколько дней вперёд планировать уведомления за один раз. */
const HORIZON_DAYS = 14;

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (cur.canAskAgain === false) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/**
 * Перепланирует локальные напоминания на ближайшие HORIZON_DAYS дней:
 * начало смены менеджера и заказы поставщикам, которые нужно сделать сегодня
 * (с учётом переноса из-за выходных — см. orderSchedule.ts).
 * Старые запланированные уведомления полностью заменяются новыми.
 */
export async function scheduleReminders(
  managerSchedule: ManagerSchedule
): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const today = toISODate(now);

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = toISODate(addDays(fromISODate(today), i));

    const shift = managerSchedule[date];
    if (shift) {
      const [h, m] = shift.start.split(':').map(Number);
      const shiftStart = fromISODate(date);
      shiftStart.setHours(h, m, 0, 0);
      const trigger = new Date(shiftStart.getTime() - SHIFT_REMINDER_MINUTES * 60_000);
      if (trigger.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Скоро смена',
            body: `Смена начинается в ${shift.start}`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
        });
      }
    }

    const dueOrders = ordersDueOn(date, managerSchedule);
    if (dueOrders.length) {
      const trigger = fromISODate(date);
      trigger.setHours(ORDER_REMINDER_HOUR, ORDER_REMINDER_MINUTE, 0, 0);
      if (trigger.getTime() > now.getTime()) {
        const body = dueOrders
          .map((o) => `${o.entry.supplier}${o.entry.note ? ` · ${o.entry.note}` : ''}`)
          .join(', ');
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Нужно заказать', body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
        });
      }
    }
  }
}
