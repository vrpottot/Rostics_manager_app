export interface Account {
  id: string;
  name: string;
  email: string;
  /** хэш пароля (мок, не для продакшена) */
  passHash: string;
  restaurantName?: string;
  position?: string;
  createdAt: string;
}

export type ManagerShiftType = 'morning' | 'day' | 'evening';

export const MANAGER_SHIFT_LABEL: Record<ManagerShiftType, string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер',
};

export const MANAGER_SHIFT_ORDER: ManagerShiftType[] = ['morning', 'day', 'evening'];

/** Фиксированные часы смен менеджера: [начало, конец] в формате HH:mm */
export const SHIFT_TIMES: Record<ManagerShiftType, [string, string]> = {
  morning: ['07:00', '15:00'],
  day: ['13:00', '21:00'],
  evening: ['15:00', '24:00'],
};

/** График менеджера: дата (YYYY-MM-DD) -> тип смены. Отсутствие даты = выходной. */
export type ManagerSchedule = Record<string, ManagerShiftType>;

export type Role = 'manager' | 'shift' | 'trainee' | 'crew';

export const ROLE_LABEL: Record<Role, string> = {
  manager: 'Управляющий',
  shift: 'Менеджер смены',
  trainee: 'Стажёр',
  crew: 'Сотрудник',
};

export interface Employee {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  color: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  position?: string;
  note?: string;
}

export type TaskCategory = 'shift' | 'opening' | 'closing' | 'product';

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  shift: 'Смена',
  opening: 'Открытие',
  closing: 'Закрытие',
  product: 'Продукт',
};

export const CATEGORY_ORDER: TaskCategory[] = [
  'shift',
  'opening',
  'closing',
  'product',
];

/** Постоянные ежедневные задачи-чек-листы, попадают в график каждый день */
export const RECURRING_CATEGORIES: TaskCategory[] = ['opening', 'closing'];

export const isRecurringCategory = (c: TaskCategory) =>
  RECURRING_CATEGORIES.includes(c);

export type TaskStatus = 'open' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'med' | 'high';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Готово',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий',
  med: 'Средний',
  high: 'Высокий',
};

export interface Task {
  id: string;
  category: TaskCategory;
  title: string;
  description?: string;
  assigneeId?: string | null;
  /** YYYY-MM-DD */
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string | null;
  /** порядок в чек-листе закрытия */
  order?: number;
}

/** Отметки выполнения ежедневных задач (открытие/закрытие) по датам: дата (YYYY-MM-DD) -> id выполненных задач */
export type DailyLog = Record<string, string[]>;
