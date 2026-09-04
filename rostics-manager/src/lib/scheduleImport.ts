import {
  entryForType,
  ManagerShiftEntry,
  ManagerShiftType,
  Role,
  shiftTypeFromStart,
} from '../types';

// xlsx подгружается лениво (тяжёлый модуль) — только когда пользователь
// реально запускает импорт, чтобы не влиять на загрузку экрана.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
type XLSXModule = typeof import('xlsx');

/**
 * Разбор недельного графика «Пожелания …».
 *
 * Формат листа:
 *   строка 0  — шапка: A=№, B=роль, C=«Пожелания», далее по дню недели
 *               3 колонки (с / до / часов), первая из них содержит дату дня;
 *   строки 3+ — сотрудники: C = ФИО, затем те же тройки колонок с числами часов.
 *
 * В книге десятки листов за разные недели с хаотичными названиями — поэтому
 * недели определяются по датам в шапке, а не по имени листа.
 */

export interface ImportedShift extends ManagerShiftEntry {
  /** YYYY-MM-DD */
  date: string;
}

export interface ImportedEmployee {
  name: string;
  role: Role;
}

/** Смена конкретного сотрудника на дату — для окна «График смен». */
export interface ImportedEmployeeShift {
  /** ФИО как в таблице */
  name: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  /** код позиции из колонки B (С/К/П…) */
  position?: string;
}

export interface ImportResult {
  /** Найдено ли ФИО в книге. */
  matched: boolean;
  /** Как записано ФИО в таблице (для подтверждения пользователем). */
  matchedName?: string;
  /** Личные смены пользователя по датам, последний лист побеждает при конфликте. */
  shifts: ImportedShift[];
  /** Сколько разных недель (листов) содержали строку пользователя. */
  weeks: number;
  /** Все ФИО из книги — показываем, если совпадение не нашлось. */
  names: string[];
  /** Ростер сотрудников из числовой части таблицы (без строки пользователя). */
  team: ImportedEmployee[];
  /** Смены всех сотрудников за все недели в файле (для окна «График смен»). */
  teamShifts: ImportedEmployeeShift[];
}

const DAY_START_COLS = [3, 6, 9, 12, 15, 18, 21];
const ROLE_COL = 1;
const NAME_COL = 2;
const FIRST_EMPLOYEE_ROW = 2;
const LAST_EMPLOYEE_ROW = 34;

/** Код роли из колонки B → роль приложения. Пользователь потом поправит вручную. */
function mapRole(code: string): Role {
  const c = code.toLowerCase();
  if (c.includes('стажер') || c.includes('стажёр')) return 'trainee';
  return 'crew';
}

function normName(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Совпадение слова по префиксу — таблица обрезает длинные ФИО. */
function prefixMatch(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, 6);
  return n >= 4 && a.slice(0, n) === b.slice(0, n);
}

/** Слово из ФИО совпало с ячейкой: полное слово ИЛИ инициал («Мухамадеев Ю»). */
function wordMatches(want: string, part: string): boolean {
  if (prefixMatch(want, part)) return true;
  // один из них — инициал (1–2 буквы): сравниваем первую букву
  if ((part.length <= 2 || want.length <= 2) && part[0] === want[0]) return true;
  return false;
}

function nameMatches(cell: string, wanted: string[]): boolean {
  const parts = cell.split(' ').filter(Boolean);
  if (!parts.length) return false;
  // самое длинное слово (фамилия) должно совпасть по-настоящему, не инициалом
  const surname = [...wanted].sort((a, b) => b.length - a.length)[0];
  if (!parts.some((p) => prefixMatch(surname, p))) return false;
  return wanted.every((w) => parts.some((p) => wordMatches(w, p)));
}

/**
 * Excel-серийный номер → ISO-дата. Без Date-объектов от SheetJS: он смещает
 * их на часовой пояс (дата уезжает на день). Тут чистая арифметика в UTC.
 */
function excelSerialToISO(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30); // Excel: серийный 1 = 1900-01-01
  const d = new Date(epoch + Math.round(serial) * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseHeaderDate(v: unknown): string | null {
  if (typeof v === 'number' && v > 20000 && v < 90000) {
    return excelSerialToISO(v);
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/(\d{1,2})[.,/\s-]+(\d{1,2})[.,/\s-]+(\d{2,4})/);
    if (m) {
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      const mm = String(Number(m[2])).padStart(2, '0');
      const dd = String(Number(m[1])).padStart(2, '0');
      if (Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 1 && Number(m[1]) <= 31)
        return `${year}-${mm}-${dd}`;
    }
  }
  return null;
}

function hourToTime(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return `${String(whole).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// ─────────────────────────────────────────── «ГРАФИК РАБОТЫ МЕНЕДЖЕРОВ» (месяц)

/**
 * Разбор месячного графика менеджеров («Расписание MNG …»).
 *
 * Один лист, десятки блоков подряд — по одному на месяц (Июль 2023 … Декабрь 2026):
 *   строка блока   — C = «Июль 2023», D = ресторан;
 *   +1             — дни недели (сб/вс/пн…);
 *   +2             — числа месяца 1..30/31 (задают колонки дней);
 *   +3 и далее     — менеджеры: A = должность, C = Ф.И.О, далее по колонке на день
 *                    с кодом смены: у=утро, д=день, в=вечер, пусто=выходной.
 * Пользователь ищется по Имени и Фамилии (порядок слов не важен), график
 * выставляется сразу на все месяцы из файла, понедельно.
 */
export interface MonthlyImportResult {
  matched: boolean;
  matchedName?: string;
  /** Смены пользователя по датам за все месяцы файла. */
  shifts: ImportedShift[];
  /** Сколько месяцев содержали строку пользователя. */
  months: number;
  /** Все Ф.И.О из файла — показываем, если совпадение не нашлось. */
  names: string[];
}

const MONTH_BY_PREFIX: Record<string, number> = {
  янв: 0, фев: 1, мар: 2, апр: 3, май: 4, июн: 5,
  июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11,
};

/** «Июль 2023» / «Октрябрь 2026» → { year, month } (month 0-based). */
function parseMonthYear(v: unknown): { year: number; month: number } | null {
  if (typeof v !== 'string') return null;
  const m = v
    .toLowerCase()
    .replace(/ё/g, 'е')
    .match(/([а-я]{3,})\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_BY_PREFIX[m[1].slice(0, 3)];
  if (month === undefined) return null;
  return { year: Number(m[2]), month };
}

/** Код в ячейке дня → тип смены менеджера. */
const MONTHLY_SHIFT_CODE: Record<string, ManagerShiftType> = {
  у: 'morning',
  д: 'day',
  в: 'evening',
};

export function parseManagerMonthlySchedule(
  data: Uint8Array | ArrayBuffer | string,
  fullName: string
): MonthlyImportResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX: XLSXModule = require('xlsx');
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'base64' })
      : XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), {
          type: 'array',
        });

  const wanted = normName(fullName)
    .split(' ')
    .filter((t) => t.length >= 3);

  const allNames = new Set<string>();
  const byDate = new Map<string, ImportedShift>();
  const monthsSeen = new Set<string>();
  let matchedName: string | undefined;
  let matchedKey = '';

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });

    for (let i = 0; i < rows.length; i++) {
      const my = parseMonthYear((rows[i] ?? [])[NAME_COL]);
      if (!my) continue;

      // строка с числами месяца — в пределах 3 строк ниже заголовка блока
      let numRow = -1;
      for (let k = i + 1; k <= i + 3 && k < rows.length; k++) {
        const ints = (rows[k] ?? []).filter(
          (x) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 31
        ).length;
        if (ints >= 5) {
          numRow = k;
          break;
        }
      }
      if (numRow < 0) continue;

      const dayCols: { col: number; date: string }[] = [];
      const nr = rows[numRow] ?? [];
      for (let c = NAME_COL + 1; c < nr.length; c++) {
        const d = nr[c];
        if (typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 31) {
          const mm = String(my.month + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          dayCols.push({ col: c, date: `${my.year}-${mm}-${dd}` });
        }
      }
      if (!dayCols.length) continue;

      // между строкой чисел и строками сотрудников может быть строка дней
      // недели с пустой ячейкой ФИО (вёрстка 2026) — её пропускаем, а
      // пустую строку считаем концом блока только после начала данных.
      let seenData = false;
      for (let r = numRow + 1; r < rows.length && r < numRow + 30; r++) {
        const row = rows[r] ?? [];
        const raw = row[NAME_COL];
        const cell = normName(raw);
        if (!cell) {
          if (seenData) break;
          continue;
        }
        if (
          cell.includes('норма месяца') ||
          cell.includes('итого') ||
          cell.includes('ф и о') ||
          cell.startsWith('смены') ||
          cell.startsWith('пересменка')
        )
          break;
        seenData = true;

        const name = String(raw).trim();
        allNames.add(name);
        const key = normName(name);

        if (!matchedKey && wanted.length >= 2 && nameMatches(cell, wanted)) {
          matchedName = name;
          matchedKey = key;
        }
        if (!matchedKey || key !== matchedKey) continue;

        monthsSeen.add(`${my.year}-${my.month}`);
        for (const { col, date } of dayCols) {
          const type = MONTHLY_SHIFT_CODE[normName(row[col])];
          if (type) byDate.set(date, { date, ...entryForType(type) });
        }
      }
    }
  }

  const shifts = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  return {
    matched: !!matchedName,
    matchedName,
    shifts,
    months: monthsSeen.size,
    names: [...allNames].sort((a, b) => a.localeCompare(b, 'ru')),
  };
}

/**
 * @param data  содержимое .xlsx (байты файла или base64-строка)
 * @param fullName  ФИО пользователя (порядок слов не важен)
 */
export function parseManagerSchedule(
  data: Uint8Array | ArrayBuffer | string,
  fullName: string
): ImportResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX: XLSXModule = require('xlsx');
  // без cellDates: даты приходят Excel-серийными числами и переводятся вручную
  // (Date-объекты SheetJS съезжают на день из-за часового пояса).
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'base64' })
      : XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), {
          type: 'array',
        });
  const wanted = normName(fullName)
    .split(' ')
    .filter((t) => t.length >= 3);

  const allNames = new Set<string>();
  const roster = new Map<string, ImportedEmployee>(); // ключ — нормализованное имя
  const shiftByKey = new Map<string, ImportedEmployeeShift>(); // ключ — «имя|дата»
  let matchedName: string | undefined;
  let matchedKey = '';
  let weeks = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
    if (!rows.length) continue;

    const header = rows[0] ?? [];
    const dayCols: { col: number; date: string }[] = [];
    for (const col of DAY_START_COLS) {
      const date = parseHeaderDate(header[col]);
      if (date) dayCols.push({ col, date });
    }
    if (dayCols.length < 3) continue;

    let sawMeHere = false;
    for (let r = FIRST_EMPLOYEE_ROW; r < Math.min(rows.length, LAST_EMPLOYEE_ROW); r++) {
      const row = rows[r] ?? [];
      const raw = row[NAME_COL];
      const cell = normName(raw);
      if (!cell) continue;
      // строки после «Итого часов» — это уже блок менеджеров / статистика
      if (cell.includes('итого') || cell === 'мс') break;

      const name = String(raw).trim();
      allNames.add(name);

      const numbered = typeof row[0] === 'number';
      const roleCode = String(row[ROLE_COL] ?? '').trim();
      const isEmployee = numbered || !!roleCode;
      const key = normName(name);

      if (isEmployee) {
        if (!roster.has(key)) roster.set(key, { name, role: mapRole(roleCode) });
        for (const { col, date } of dayCols) {
          const s = row[col];
          const e = row[col + 1];
          if (
            typeof s === 'number' &&
            typeof e === 'number' &&
            e > s &&
            s >= 0 &&
            e <= 24
          ) {
            shiftByKey.set(`${key}|${date}`, {
              name,
              date,
              start: hourToTime(s),
              end: hourToTime(e),
              position: roleCode || undefined,
            });
          }
        }
      }

      // нужно минимум 2 совпавших слова — иначе одно имя даст ложные совпадения
      if (wanted.length >= 2 && !matchedKey && nameMatches(cell, wanted)) {
        matchedName = name;
        matchedKey = key;
      }
      if (matchedKey && key === matchedKey) sawMeHere = true;
    }
    if (sawMeHere) weeks++;
  }

  const shifts: ImportedShift[] = [];
  const teamShifts: ImportedEmployeeShift[] = [];
  for (const sh of shiftByKey.values()) {
    if (normName(sh.name) === matchedKey) {
      shifts.push({
        date: sh.date,
        start: sh.start,
        end: sh.end,
        type: shiftTypeFromStart(sh.start),
      });
    } else {
      teamShifts.push(sh);
    }
  }
  shifts.sort((a, b) => a.date.localeCompare(b.date));
  teamShifts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)
  );

  const team = [...roster.values()]
    .filter((e) => normName(e.name) !== matchedKey)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return {
    matched: !!matchedName,
    matchedName,
    shifts,
    weeks,
    names: [...allNames].sort((a, b) => a.localeCompare(b, 'ru')),
    team,
    teamShifts,
  };
}
