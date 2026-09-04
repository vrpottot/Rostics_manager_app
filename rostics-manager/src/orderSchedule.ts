import { ManagerSchedule } from './types';
import { addDays, fromISODate, toISODate } from './utils';

/** Пн=0 … Вс=6 — как в startOfWeek/утилитах графика. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  0: 'пн',
  1: 'вт',
  2: 'ср',
  3: 'чт',
  4: 'пт',
  5: 'сб',
  6: 'вс',
};

export interface OrderScheduleEntry {
  id: string;
  supplier: string;
  /** день заказа */
  orderDay: Weekday;
  /** день поставки */
  deliveryDay: Weekday;
  /** ОХЛ / ЗАМ и т.п. */
  note?: string;
}

/**
 * График заказов поставщикам — с фото «ГРАФИК ЗАКАЗОВ» на складе.
 * Правится прямо здесь; если день/поставщик изменился — поменяйте запись.
 */
export const ORDER_SCHEDULE: OrderScheduleEntry[] = [
  { id: 'resurs-tue', supplier: 'Ресурс', orderDay: 1, deliveryDay: 4, note: 'охл' },
  { id: 'resurs-wed', supplier: 'Ресурс', orderDay: 2, deliveryDay: 0, note: 'зам' },
  { id: 'resurs-thu-zam', supplier: 'Ресурс', orderDay: 3, deliveryDay: 0, note: 'зам' },
  { id: 'resurs-fri-ohl', supplier: 'Ресурс', orderDay: 4, deliveryDay: 2, note: 'охл' },
  { id: 'pepsi-mon', supplier: 'Пепси', orderDay: 0, deliveryDay: 2 },
  { id: 'pepsi-thu', supplier: 'Пепси', orderDay: 3, deliveryDay: 5 },
  { id: 'ivl-tue', supplier: 'ИВЛ', orderDay: 1, deliveryDay: 3 },
  { id: 'ivl-thu', supplier: 'ИВЛ', orderDay: 3, deliveryDay: 5 },
  { id: 'ivl-sun', supplier: 'ИВЛ', orderDay: 6, deliveryDay: 1 },
  { id: 'provance-wed', supplier: 'Прованс', orderDay: 2, deliveryDay: 5 },
  { id: 'provance-sat', supplier: 'Прованс', orderDay: 5, deliveryDay: 2 },
];

const weekdayIndex = (iso: string) => (fromISODate(iso).getDay() + 6) % 7;

/** Ближайшая дата с этим днём недели, которая <= todayISO (может быть сегодня). */
function mostRecentOccurrence(todayISO: string, weekday: Weekday): string {
  const diff = (weekdayIndex(todayISO) - weekday + 7) % 7;
  return toISODate(addDays(fromISODate(todayISO), -diff));
}

export interface DueOrder {
  entry: OrderScheduleEntry;
  /** обычный день заказа на этой неделе */
  orderDate: string;
  /** день поставки */
  deliveryDate: string;
  /** заказ сегодня — это не его обычный день, а перенос из-за выходного */
  shifted: boolean;
}

/**
 * Какие заказы нужно сделать именно сегодня — с учётом личного графика:
 * если обычный день заказа выпал на выходной менеджера, заказ переезжает
 * на ближайшую его смену до дня поставки (чтобы не потерять окно заказа).
 * Если рабочих смен в этом окне вообще нет — заказ не показывается
 * (сдвигать уже некуда, нужен ручной контроль).
 */
export function ordersDueOn(
  todayISO: string,
  managerSchedule: ManagerSchedule
): DueOrder[] {
  const result: DueOrder[] = [];
  for (const entry of ORDER_SCHEDULE) {
    const orderDate = mostRecentOccurrence(todayISO, entry.orderDay);
    const offset = (entry.deliveryDay - entry.orderDay + 7) % 7 || 7;
    const deliveryDate = toISODate(addDays(fromISODate(orderDate), offset));

    if (todayISO >= deliveryDate) continue; // окно этой недели уже закрылось

    let effectiveDate: string | null = null;
    for (let d = orderDate; d < deliveryDate; d = toISODate(addDays(fromISODate(d), 1))) {
      if (managerSchedule[d]) {
        effectiveDate = d;
        break;
      }
    }

    if (effectiveDate === todayISO) {
      result.push({ entry, orderDate, deliveryDate, shifted: effectiveDate !== orderDate });
    }
  }

  // тот же поставщик + тип + дата поставки — на деле один и тот же заказ
  // (просто совпал обычный день одного слота с переносом другого)
  const seen = new Map<string, DueOrder>();
  for (const due of result) {
    const key = `${due.entry.supplier}|${due.entry.note ?? ''}|${due.deliveryDate}`;
    const prev = seen.get(key);
    if (!prev || (prev.shifted && !due.shifted)) seen.set(key, due);
  }
  return [...seen.values()];
}
