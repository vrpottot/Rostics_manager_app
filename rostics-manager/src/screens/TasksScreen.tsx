import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TasksStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Avatar, Card, Chip, EmptyState, FAB, Hero } from '../components';
import {
  CATEGORY_LABEL,
  isRecurringCategory,
  MANAGER_SHIFT_LABEL,
  ManagerSchedule,
  ManagerShiftEntry,
  ManagerShiftType,
  PRIORITY_LABEL,
  STATUS_LABEL,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../types';
import {
  addDays,
  humanDate,
  toISODate,
  todayISO,
  weekdayShort,
} from '../utils';
import { dailyQuote } from '../quotes';
import { DueOrder, ordersDueOn, WEEKDAY_LABEL } from '../orderSchedule';

type Props = NativeStackScreenProps<TasksStackParams, 'TasksList'>;

const FILTERS: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'done', label: STATUS_LABEL.done },
];

/** Какой чек-лист (открытие/закрытие) закреплён за сменой менеджера */
const RECURRING_FOR_SHIFT: Record<ManagerShiftType, 'opening' | 'closing'> = {
  morning: 'opening',
  day: 'closing',
  evening: 'closing',
};

const priorityStyle = (
  colors: Colors
): Record<TaskPriority, { color: string; bg: string }> => ({
  low: { color: colors.textMuted, bg: colors.subtle },
  med: { color: colors.warning, bg: colors.warningTint },
  high: { color: colors.brand, bg: colors.brandTint },
});

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
};

export default function TasksScreen({ navigation }: Props) {
  const {
    tasks,
    employees,
    managerSchedule,
    dailyLog,
    updateTask,
    moveChecklistTask,
    setDailyChecked,
  } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const PRIORITY = useMemo(() => priorityStyle(colors), [colors]);

  const today = todayISO();
  const todayShift = managerSchedule[today];

  // ----- выходной -----
  if (!todayShift) {
    return (
      <View style={styles.screen}>
        <Hero title="Выходной" />
        <View style={styles.dayOff}>
          <Ionicons name="cafe-outline" size={56} color={colors.textFaint} />
          <Text style={styles.dayOffText}>
            У вас сегодня выходной, отдыхайте
          </Text>
        </View>
      </View>
    );
  }

  return (
    <WorkingDay
      styles={styles}
      colors={colors}
      PRIORITY={PRIORITY}
      navigation={navigation}
      tasks={tasks}
      employees={employees}
      dailyLog={dailyLog}
      managerSchedule={managerSchedule}
      today={today}
      todayShift={todayShift}
      updateTask={updateTask}
      moveChecklistTask={moveChecklistTask}
      setDailyChecked={setDailyChecked}
    />
  );
}

function WorkingDay({
  styles,
  colors,
  PRIORITY,
  navigation,
  tasks,
  employees,
  dailyLog,
  managerSchedule,
  today,
  todayShift,
  updateTask,
  moveChecklistTask,
  setDailyChecked,
}: {
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
  PRIORITY: Record<TaskPriority, { color: string; bg: string }>;
  navigation: Props['navigation'];
  tasks: Task[];
  employees: { id: string; name: string; color: string }[];
  dailyLog: Record<string, string[]>;
  managerSchedule: ManagerSchedule;
  today: string;
  todayShift: ManagerShiftEntry;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveChecklistTask: (id: string, dir: -1 | 1) => void;
  setDailyChecked: (date: string, id: string, done: boolean) => void;
}) {
  const recurringToday = RECURRING_FOR_SHIFT[todayShift.type];
  const visibleCats = useMemo<TaskCategory[]>(
    () => ['shift', recurringToday, 'product'],
    [recurringToday]
  );

  const [rawCategory, setCategory] = useState<TaskCategory>('shift');
  const category = visibleCats.includes(rawCategory) ? rawCategory : 'shift';
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const recurring = isRecurringCategory(category);
  const doneToday = dailyLog[today] ?? [];
  const [sh, eh] = [todayShift.start, todayShift.end];

  const checklistTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.category === category && isRecurringCategory(category))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks, category]
  );

  const listTasks = useMemo(() => {
    const list = tasks.filter(
      (t) => t.category === category && (filter === 'all' || t.status === filter)
    );
    const rank = { high: 0, med: 1, low: 2 };
    return list.sort(
      (a, b) =>
        Number(a.status === 'done') - Number(b.status === 'done') ||
        rank[a.priority] - rank[b.priority] ||
        b.createdAt.localeCompare(a.createdAt)
    );
  }, [tasks, category, filter]);

  const quote = useMemo(() => dailyQuote(), []);
  const dueOrders = useMemo(
    () => (category === 'product' ? ordersDueOn(today, managerSchedule) : []),
    [category, today, managerSchedule]
  );
  const ordersByDay = useMemo(() => {
    if (category !== 'product') return [];
    const start = new Date(today + 'T00:00:00');
    return Array.from({ length: 30 }, (_, i) => {
      const date = toISODate(addDays(start, i));
      return { date, orders: ordersDueOn(date, managerSchedule) };
    });
  }, [category, today, managerSchedule]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const cycleStatus = (t: Task) => {
    const status = NEXT_STATUS[t.status];
    updateTask(t.id, {
      status,
      completedAt: status === 'done' ? new Date().toISOString() : null,
    });
  };

  return (
    <View style={styles.screen}>
      <Hero
        title={quote}
        titleSize={22}
        subtitle={`Ваша смена: ${MANAGER_SHIFT_LABEL[todayShift.type]} · ${sh}–${eh}`}
      />

      <View style={styles.tabs}>
        {visibleCats.map((c) => {
          const on = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text
                style={[styles.tabText, on && styles.tabTextOn]}
                numberOfLines={1}
              >
                {CATEGORY_LABEL[c]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {recurring ? (
        <ChecklistView
          styles={styles}
          colors={colors}
          kind={category}
          tasks={checklistTasks}
          doneToday={doneToday}
          onToggle={(id, done) => setDailyChecked(today, id, done)}
          onMove={moveChecklistTask}
          onEdit={(id) => navigation.navigate('TaskEdit', { taskId: id })}
        />
      ) : (
        <>
          {category === 'product' ? (
            <>
              {dueOrders.length > 0 ? (
                <OrdersDueCard orders={dueOrders} styles={styles} colors={colors} />
              ) : null}
              <Pressable
                style={styles.calendarBtn}
                onPress={() => setCalendarOpen(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                <Text style={styles.calendarBtnText}>Календарь заказов</Text>
              </Pressable>
              <OrdersCalendarModal
                visible={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                days={ordersByDay}
                today={today}
                styles={styles}
                colors={colors}
              />
            </>
          ) : null}

          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </View>

          {listTasks.length === 0 ? (
            <EmptyState
              icon="checkmark-done-outline"
              text="Здесь пока нет задач"
            />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {listTasks.map((t) => {
                const who = employees.find((e) => e.id === t.assigneeId);
                const p = PRIORITY[t.priority];
                const isDone = t.status === 'done';
                return (
                  <Pressable
                    key={t.id}
                    onPress={() =>
                      navigation.navigate('TaskEdit', { taskId: t.id })
                    }
                  >
                    <Card style={isDone ? { opacity: 0.55 } : undefined}>
                      <View style={styles.row}>
                        <Pressable onPress={() => cycleStatus(t)} hitSlop={10}>
                          <Ionicons
                            name={
                              isDone
                                ? 'checkmark-circle'
                                : t.status === 'in_progress'
                                ? 'time'
                                : 'ellipse-outline'
                            }
                            size={24}
                            color={
                              isDone
                                ? colors.success
                                : t.status === 'in_progress'
                                ? colors.warning
                                : colors.brand
                            }
                          />
                        </Pressable>
                        <View style={styles.flex}>
                          <Text style={[styles.title, isDone && styles.done]}>
                            {t.title}
                          </Text>
                          <View style={styles.meta}>
                            <View
                              style={[styles.pill, { backgroundColor: p.bg }]}
                            >
                              <Text style={[styles.pillText, { color: p.color }]}>
                                {PRIORITY_LABEL[t.priority].toUpperCase()}
                              </Text>
                            </View>
                            {t.dueDate ? (
                              <Text style={styles.metaText}>
                                до {humanDate(t.dueDate)}
                              </Text>
                            ) : t.status === 'in_progress' ? (
                              <Text style={styles.metaText}>в работе</Text>
                            ) : null}
                          </View>
                        </View>
                        {who ? (
                          <Avatar name={who.name} color={who.color} size={34} />
                        ) : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
              <View style={{ height: 90 }} />
            </ScrollView>
          )}
        </>
      )}

      <FAB onPress={() => navigation.navigate('TaskEdit', { category })} />
    </View>
  );
}

function OrdersDueCard({
  orders,
  styles,
  colors,
}: {
  orders: DueOrder[];
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
}) {
  return (
    <View style={styles.ordersWrap}>
      <Card>
        <View style={styles.ordersHead}>
          <Ionicons name="cube-outline" size={18} color={colors.brand} />
          <Text style={styles.ordersTitle}>Сегодня нужно заказать</Text>
        </View>
        {orders.map(({ entry, deliveryDate, shifted }) => (
          <View key={entry.id} style={styles.orderRow}>
            <Text style={styles.orderSupplier}>
              {entry.supplier}
              {entry.note ? ` · ${entry.note}` : ''}
            </Text>
            <Text style={styles.orderMeta}>
              поставка {WEEKDAY_LABEL[entry.deliveryDay]} · {humanDate(deliveryDate)}
              {shifted ? ' · перенос с выходного' : ''}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

function OrdersCalendarModal({
  visible,
  onClose,
  days,
  today,
  styles,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  days: { date: string; orders: DueOrder[] }[];
  today: string;
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalScreen}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>Календарь заказов</Text>
          <Pressable hitSlop={12} onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalList}>
          {days.map(({ date, orders }) => {
            const isToday = date === today;
            return (
              <View
                key={date}
                style={[styles.calRow, isToday && styles.calRowToday]}
              >
                <View style={styles.calDateCol}>
                  <Text style={[styles.calWeekday, isToday && styles.dayCardTodayText]}>
                    {isToday ? 'Сегодня' : weekdayShort(date)}
                  </Text>
                  <Text style={[styles.calDate, isToday && styles.dayCardTodayText]}>
                    {humanDate(date)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  {orders.length === 0 ? (
                    <Text style={styles.dayCardEmpty}>Заказов нет</Text>
                  ) : (
                    orders.map(({ entry, deliveryDate }) => (
                      <View key={entry.id} style={styles.dayCardOrderBlock}>
                        <Text style={styles.dayCardOrder}>
                          {entry.supplier}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </Text>
                        <Text style={styles.dayCardOrderDelivery}>
                          на {WEEKDAY_LABEL[entry.deliveryDay]} · {humanDate(deliveryDate)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function ChecklistView({
  styles,
  colors,
  kind,
  tasks,
  doneToday,
  onToggle,
  onMove,
  onEdit,
}: {
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
  kind: TaskCategory;
  tasks: Task[];
  doneToday: string[];
  onToggle: (id: string, done: boolean) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onEdit: (id: string) => void;
}) {
  const done = doneToday.filter((id) => tasks.some((t) => t.id === id)).length;
  const pct = tasks.length ? done / tasks.length : 0;

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={kind === 'opening' ? 'sunny-outline' : 'moon-outline'}
        text={`Добавьте пункты чек-листа «${CATEGORY_LABEL[kind]}»`}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Card>
        <Text style={styles.summaryTitle}>{CATEGORY_LABEL[kind]} сегодня</Text>
        <Text style={styles.summaryCount}>
          {done} из {tasks.length}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.summaryHint}>
          Чек-лист повторяется каждый день и виден в графике.
        </Text>
      </Card>

      {tasks.map((t, i) => {
        const checked = doneToday.includes(t.id);
        return (
          <View key={t.id} style={styles.closingRow}>
            <Pressable
              hitSlop={8}
              onPress={() => onToggle(t.id, !checked)}
              style={styles.check}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={24}
                color={checked ? colors.success : colors.textFaint}
              />
            </Pressable>
            <Pressable style={styles.flex} onPress={() => onEdit(t.id)}>
              <Text
                style={[styles.closingTitle, checked && styles.done]}
                numberOfLines={2}
              >
                {t.title}
              </Text>
            </Pressable>
            <View style={styles.reorder}>
              <Pressable
                hitSlop={6}
                disabled={i === 0}
                onPress={() => onMove(t.id, -1)}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={i === 0 ? colors.border : colors.textMuted}
                />
              </Pressable>
              <Pressable
                hitSlop={6}
                disabled={i === tasks.length - 1}
                onPress={() => onMove(t.id, 1)}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={
                    i === tasks.length - 1 ? colors.border : colors.textMuted
                  }
                />
              </Pressable>
            </View>
          </View>
        );
      })}
      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    dayOff: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 16,
    },
    dayOffText: {
      fontFamily: font.semibold,
      fontSize: 17,
      color: colors.textMuted,
      textAlign: 'center',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 6,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabOn: { borderBottomColor: colors.brand },
    tabText: { fontFamily: font.semibold, fontSize: 13, color: colors.textMuted },
    tabTextOn: { color: colors.brand, fontFamily: font.bold },
    ordersWrap: { paddingHorizontal: 18, paddingTop: 14 },
    ordersHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ordersTitle: { fontFamily: font.bold, fontSize: 14, color: colors.text },
    orderRow: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    orderSupplier: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
    orderMeta: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    calendarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.brandTint,
      marginHorizontal: 18,
      marginTop: 14,
    },
    calendarBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.brand },
    dayCardTodayText: { color: colors.brand },
    dayCardEmpty: { fontFamily: font.medium, fontSize: 12, color: colors.textFaint },
    dayCardOrderBlock: { marginTop: 6 },
    dayCardOrder: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
    },
    dayCardOrderDelivery: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    modalScreen: { flex: 1, backgroundColor: colors.bg },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontFamily: font.display, fontSize: 18, color: colors.text },
    modalList: { paddingHorizontal: 18, paddingTop: 8 },
    calRow: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    calRowToday: {
      backgroundColor: colors.brandTint,
      borderRadius: 12,
      paddingHorizontal: 10,
      borderBottomWidth: 0,
    },
    calDateCol: { width: 84 },
    calWeekday: {
      fontFamily: font.bold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    calDate: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
      marginTop: 1,
    },
    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 18,
      paddingTop: 14,
    },
    list: { paddingHorizontal: 18, paddingTop: 12 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    flex: { flex: 1 },
    title: {
      fontFamily: font.display,
      fontSize: 16,
      lineHeight: 21,
      letterSpacing: -0.2,
      color: colors.text,
    },
    done: { textDecorationLine: 'line-through', color: colors.textMuted },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    pillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.3 },
    metaText: { fontFamily: font.semibold, fontSize: 12, color: colors.textMuted },

    summaryTitle: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.textMuted,
    },
    summaryCount: {
      fontFamily: font.display,
      fontSize: 26,
      color: colors.text,
      marginTop: 2,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.subtle,
      marginTop: 10,
      overflow: 'hidden',
    },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.success },
    summaryHint: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textFaint,
      marginTop: 10,
      lineHeight: 16,
    },

    closingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    check: { paddingVertical: 2 },
    closingTitle: {
      fontFamily: font.semibold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.text,
    },
    reorder: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  });
