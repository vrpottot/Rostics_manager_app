import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import {
  Account,
  DailyLog,
  Employee,
  isRecurringCategory,
  ManagerSchedule,
  ManagerShiftType,
  Shift,
  Task,
} from './types';
import { EMPLOYEE_COLORS } from './theme';

export type AuthResult = { ok: true } | { ok: false; error: string };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20_000, refetchOnWindowFocus: false },
  },
});

// ─────────────────────────────────────────── маппинг строк БД → типы приложения

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapEmployee = (r: any): Employee => ({
  id: r.id,
  name: r.name,
  role: r.role,
  color: r.color,
  phone: r.phone ?? undefined,
});

const mapShift = (r: any): Shift => ({
  id: r.id,
  employeeId: r.employee_id,
  date: r.work_date,
  start: r.start_time,
  end: r.end_time,
  position: r.position ?? undefined,
  note: r.note ?? undefined,
});

const mapTask = (r: any): Task => ({
  id: r.id,
  category: r.category,
  title: r.title,
  description: r.description ?? undefined,
  assigneeId: r.assignee_id ?? null,
  dueDate: r.due_date ?? null,
  priority: r.priority,
  status: r.status,
  createdAt: r.created_at,
  completedAt: r.completed_at ?? null,
  order: r.sort_order ?? undefined,
});

function taskPatchToDb(p: Partial<Task>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if ('category' in p) d.category = p.category;
  if ('title' in p) d.title = p.title;
  if ('description' in p) d.description = p.description ?? null;
  if ('assigneeId' in p) d.assignee_id = p.assigneeId ?? null;
  if ('dueDate' in p) d.due_date = p.dueDate ?? null;
  if ('priority' in p) d.priority = p.priority;
  if ('status' in p) d.status = p.status;
  if ('completedAt' in p) d.completed_at = p.completedAt ?? null;
  if ('order' in p) d.sort_order = p.order ?? null;
  return d;
}

function shiftPatchToDb(p: Partial<Shift>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if ('employeeId' in p) d.employee_id = p.employeeId;
  if ('date' in p) d.work_date = p.date;
  if ('start' in p) d.start_time = p.start;
  if ('end' in p) d.end_time = p.end;
  if ('position' in p) d.position = p.position ?? null;
  if ('note' in p) d.note = p.note ?? null;
  return d;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────── интерфейс хука (без изменений)

interface AppData {
  account: Account | null;
  session: boolean;
  managerSchedule: ManagerSchedule;
  employees: Employee[];
  shifts: Shift[];
  tasks: Task[];
  dailyLog: DailyLog;
}

interface StoreValue extends AppData {
  ready: boolean;
  isAuthed: boolean;
  register: (input: {
    name: string;
    email: string;
    password: string;
    restaurantName?: string;
  }) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  updateAccount: (
    patch: Partial<Pick<Account, 'name' | 'restaurantName' | 'position'>>
  ) => void;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  setManagerShift: (date: string, type: ManagerShiftType | null) => void;
  addEmployee: (e: Omit<Employee, 'id' | 'color'>) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addShift: (s: Omit<Shift, 'id'>) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  addTask: (
    t: Omit<Task, 'id' | 'createdAt' | 'status' | 'order'> & {
      status?: Task['status'];
    }
  ) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  moveChecklistTask: (id: string, dir: -1 | 1) => void;
  setDailyChecked: (date: string, taskId: string, done: boolean) => void;
}

const Ctx = createContext<StoreValue | null>(null);

// ─────────────────────────────────────────── провайдер

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner>{children}</Inner>
    </QueryClientProvider>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        qc.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const uid = session?.user?.id ?? null;
  const enabled = !!uid;

  const profileQ = useQuery({
    queryKey: ['profile', uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, position, created_at, restaurant_id, restaurants(name)')
        .eq('id', uid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { account: null as Account | null, restaurantId: null };
      const account: Account = {
        id: data.id,
        name: data.name,
        email: session?.user?.email ?? '',
        passHash: '',
        position: data.position ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        restaurantName: (data.restaurants as any)?.name ?? undefined,
        createdAt: data.created_at,
      };
      return { account, restaurantId: data.restaurant_id as string };
    },
  });

  const account = profileQ.data?.account ?? null;
  const restaurantId = profileQ.data?.restaurantId ?? null;
  const hasRest = !!restaurantId;

  const employeesQ = useQuery({
    queryKey: ['employees', restaurantId],
    enabled: hasRest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data.map(mapEmployee);
    },
  });

  const shiftsQ = useQuery({
    queryKey: ['shifts', restaurantId],
    enabled: hasRest,
    queryFn: async () => {
      const { data, error } = await supabase.from('shifts').select('*');
      if (error) throw error;
      return data.map(mapShift);
    },
  });

  const tasksQ = useQuery({
    queryKey: ['tasks', restaurantId],
    enabled: hasRest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data.map(mapTask);
    },
  });

  const scheduleQ = useQuery({
    queryKey: ['schedule', uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_schedule')
        .select('work_date, shift_type')
        .eq('profile_id', uid!);
      if (error) throw error;
      const m: ManagerSchedule = {};
      for (const r of data) m[r.work_date] = r.shift_type;
      return m;
    },
  });

  const checksQ = useQuery({
    queryKey: ['checks', restaurantId],
    enabled: hasRest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checks')
        .select('check_date, task_id');
      if (error) throw error;
      const log: DailyLog = {};
      for (const r of data) (log[r.check_date] ??= []).push(r.task_id);
      return log;
    },
  });

  const employees = employeesQ.data ?? EMPTY_EMPLOYEES;
  const shifts = shiftsQ.data ?? EMPTY_SHIFTS;
  const tasks = tasksQ.data ?? EMPTY_TASKS;
  const managerSchedule = scheduleQ.data ?? EMPTY_SCHEDULE;
  const dailyLog = checksQ.data ?? EMPTY_LOG;

  const ready = authReady && (!uid || profileQ.isFetched);

  const value = useMemo<StoreValue>(() => {
    const invalidate = (key: string) =>
      qc.invalidateQueries({ queryKey: [key] });

    return {
      account,
      session: !!session,
      isAuthed: !!session,
      ready,
      managerSchedule,
      employees,
      shifts,
      tasks,
      dailyLog,

      // ─── авторизация
      register: async ({ name, email, password, restaurantName }) => {
        if (!name.trim()) return { ok: false, error: 'Введите имя' };
        if (password.length < 6)
          return { ok: false, error: 'Пароль минимум 6 символов' };
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              name: name.trim(),
              restaurant_name: restaurantName?.trim() ?? '',
            },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes('already'))
            return { ok: false, error: 'Аккаунт с таким email уже есть' };
          return { ok: false, error: error.message };
        }
        if (!data.session)
          return {
            ok: false,
            error: 'Требуется подтверждение email. Отключите его в настройках Supabase.',
          };
        return { ok: true };
      },

      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) return { ok: false, error: 'Неверный email или пароль' };
        return { ok: true };
      },

      logout: async () => {
        await supabase.auth.signOut();
        qc.clear();
      },

      changePassword: async (current, next) => {
        if (next.length < 6)
          return { ok: false, error: 'Новый пароль минимум 6 символов' };
        const email = session?.user?.email;
        if (!email) return { ok: false, error: 'Нет активной сессии' };
        const check = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (check.error)
          return { ok: false, error: 'Текущий пароль неверный' };
        const { error } = await supabase.auth.updateUser({ password: next });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },

      updateAccount: async (patch) => {
        if (!account) return;
        const prof: Record<string, unknown> = {};
        if (patch.name !== undefined)
          prof.name = patch.name.trim() || account.name;
        if (patch.position !== undefined)
          prof.position = patch.position.trim() || null;
        if (Object.keys(prof).length) {
          const { error } = await supabase
            .from('profiles')
            .update(prof)
            .eq('id', account.id);
          if (error) console.warn(error.message);
        }
        if (patch.restaurantName !== undefined && restaurantId) {
          const { error } = await supabase
            .from('restaurants')
            .update({ name: patch.restaurantName.trim() || 'Мой ресторан' })
            .eq('id', restaurantId);
          if (error) console.warn(error.message);
        }
        invalidate('profile');
      },

      // ─── личный график менеджера
      setManagerShift: async (date, type) => {
        if (!uid || !restaurantId) return;
        const key = ['schedule', uid];
        const prev = qc.getQueryData<ManagerSchedule>(key);
        qc.setQueryData<ManagerSchedule>(key, (old) => {
          const m = { ...(old ?? {}) };
          if (type) m[date] = type;
          else delete m[date];
          return m;
        });
        try {
          if (type) {
            const { error } = await supabase.from('manager_schedule').upsert(
              {
                profile_id: uid,
                restaurant_id: restaurantId,
                work_date: date,
                shift_type: type,
              },
              { onConflict: 'profile_id,work_date' }
            );
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('manager_schedule')
              .delete()
              .eq('profile_id', uid)
              .eq('work_date', date);
            if (error) throw error;
          }
        } catch (e) {
          qc.setQueryData(key, prev);
          console.warn(e);
        }
        invalidate('schedule');
      },

      // ─── сотрудники
      addEmployee: async (e) => {
        if (!restaurantId) return;
        const color =
          EMPLOYEE_COLORS[employees.length % EMPLOYEE_COLORS.length];
        const { error } = await supabase.from('employees').insert({
          restaurant_id: restaurantId,
          name: e.name,
          role: e.role,
          phone: e.phone ?? null,
          color,
        });
        if (error) console.warn(error.message);
        invalidate('employees');
      },

      updateEmployee: async (id, patch) => {
        const d: Record<string, unknown> = {};
        if ('name' in patch) d.name = patch.name;
        if ('role' in patch) d.role = patch.role;
        if ('phone' in patch) d.phone = patch.phone ?? null;
        if ('color' in patch) d.color = patch.color;
        const { error } = await supabase
          .from('employees')
          .update(d)
          .eq('id', id);
        if (error) console.warn(error.message);
        invalidate('employees');
      },

      removeEmployee: async (id) => {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) console.warn(error.message);
        invalidate('employees');
        invalidate('shifts');
        invalidate('tasks');
      },

      // ─── смены сотрудников
      addShift: async (s) => {
        if (!restaurantId) return;
        const { error } = await supabase.from('shifts').insert({
          restaurant_id: restaurantId,
          employee_id: s.employeeId,
          work_date: s.date,
          start_time: s.start,
          end_time: s.end,
          position: s.position ?? null,
          note: s.note ?? null,
        });
        if (error) console.warn(error.message);
        invalidate('shifts');
      },

      updateShift: async (id, patch) => {
        const { error } = await supabase
          .from('shifts')
          .update(shiftPatchToDb(patch))
          .eq('id', id);
        if (error) console.warn(error.message);
        invalidate('shifts');
      },

      removeShift: async (id) => {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (error) console.warn(error.message);
        invalidate('shifts');
      },

      // ─── задачи
      addTask: async (t) => {
        if (!restaurantId) return;
        let sortOrder: number | null = null;
        if (isRecurringCategory(t.category)) {
          const same = tasks.filter((x) => x.category === t.category);
          sortOrder =
            Math.max(-1, ...same.map((x) => x.order ?? 0)) + 1;
        }
        const { error } = await supabase.from('tasks').insert({
          restaurant_id: restaurantId,
          category: t.category,
          title: t.title,
          description: t.description ?? null,
          assignee_id: t.assigneeId ?? null,
          due_date: t.dueDate ?? null,
          priority: t.priority,
          status: t.status ?? 'open',
          sort_order: sortOrder,
        });
        if (error) console.warn(error.message);
        invalidate('tasks');
      },

      updateTask: async (id, patch) => {
        const key = ['tasks', restaurantId];
        const prev = qc.getQueryData<Task[]>(key);
        qc.setQueryData<Task[]>(key, (old) =>
          (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
        const { error } = await supabase
          .from('tasks')
          .update(taskPatchToDb(patch))
          .eq('id', id);
        if (error) {
          qc.setQueryData(key, prev);
          console.warn(error.message);
        }
        invalidate('tasks');
      },

      removeTask: async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) console.warn(error.message);
        invalidate('tasks');
        invalidate('checks');
      },

      moveChecklistTask: async (id, dir) => {
        const key = ['tasks', restaurantId];
        const cur = qc.getQueryData<Task[]>(key) ?? tasks;
        const target = cur.find((t) => t.id === id);
        if (!target) return;
        const list = cur
          .filter((t) => t.category === target.category)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const i = list.findIndex((t) => t.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        const a = list[i];
        const b = list[j];
        const ao = a.order ?? i;
        const bo = b.order ?? j;
        const prev = cur;
        qc.setQueryData<Task[]>(key, (old) =>
          (old ?? []).map((t) =>
            t.id === a.id
              ? { ...t, order: bo }
              : t.id === b.id
              ? { ...t, order: ao }
              : t
          )
        );
        const r1 = await supabase
          .from('tasks')
          .update({ sort_order: bo })
          .eq('id', a.id);
        const r2 = await supabase
          .from('tasks')
          .update({ sort_order: ao })
          .eq('id', b.id);
        if (r1.error || r2.error) qc.setQueryData(key, prev);
        invalidate('tasks');
      },

      setDailyChecked: async (date, taskId, done) => {
        if (!restaurantId) return;
        const key = ['checks', restaurantId];
        const prev = qc.getQueryData<DailyLog>(key);
        qc.setQueryData<DailyLog>(key, (old) => {
          const log: DailyLog = { ...(old ?? {}) };
          const set = new Set(log[date] ?? []);
          if (done) set.add(taskId);
          else set.delete(taskId);
          log[date] = [...set];
          return log;
        });
        try {
          if (done) {
            const { error } = await supabase.from('daily_checks').upsert(
              {
                restaurant_id: restaurantId,
                task_id: taskId,
                check_date: date,
                done_by: uid,
              },
              { onConflict: 'task_id,check_date' }
            );
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('daily_checks')
              .delete()
              .eq('task_id', taskId)
              .eq('check_date', date);
            if (error) throw error;
          }
        } catch (e) {
          qc.setQueryData(key, prev);
          console.warn(e);
        }
        invalidate('checks');
      },
    };
  }, [
    qc,
    account,
    session,
    ready,
    restaurantId,
    uid,
    employees,
    shifts,
    tasks,
    managerSchedule,
    dailyLog,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const EMPTY_EMPLOYEES: Employee[] = [];
const EMPTY_SHIFTS: Shift[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_SCHEDULE: ManagerSchedule = {};
const EMPTY_LOG: DailyLog = {};

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
}

export function useEmployee(id?: string | null): Employee | undefined {
  const { employees } = useStore();
  return employees.find((e) => e.id === id) ?? undefined;
}
