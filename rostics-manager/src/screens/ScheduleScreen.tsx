import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScheduleStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Avatar, Card, Hero } from '../components';
import {
  addDays,
  humanDate,
  shiftHours,
  startOfWeek,
  toISODate,
  todayISO,
  weekdayShort,
} from '../utils';

type Props = NativeStackScreenProps<ScheduleStackParams, 'ScheduleWeek'>;

export default function ScheduleScreen({ navigation }: Props) {
  const { shifts, employees } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  // свёрнутые дни — по умолчанию раскрыт только сегодня
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleDay = (d: string) =>
    setCollapsed((c) => ({ ...c, [d]: !(c[d] ?? d !== todayISO()) }));
  const isOpen = (d: string) => !(collapsed[d] ?? d !== todayISO());

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))),
    [weekStart]
  );

  // раньше текущей недели листать нельзя — график начинается с неё
  const minWeek = useMemo(() => toISODate(startOfWeek(new Date())), []);

  const byDay = useMemo(() => {
    const map: Record<string, typeof shifts> = {};
    for (const d of days) map[d] = [];
    for (const s of shifts) if (map[s.date]) map[s.date].push(s);
    for (const d of days) map[d].sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [shifts, days]);

  const weekHours = days.reduce(
    (sum, d) => sum + byDay[d].reduce((t, s) => t + shiftHours(s.start, s.end), 0),
    0
  );

  const rangeLabel = `${humanDate(days[0])} – ${humanDate(days[6])}`;

  return (
    <View style={styles.screen}>
      <Hero title="График смен" />

      <View style={styles.weekBar}>
        <View style={styles.weekNav}>
          {days[0] > minWeek ? (
            <Pressable
              hitSlop={10}
              onPress={() => setWeekStart((w) => addDays(w, -7))}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}
          <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))}>
            <Text style={styles.range}>{rangeLabel}</Text>
          </Pressable>
          <Pressable hitSlop={10} onPress={() => setWeekStart((w) => addDays(w, 7))}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.sub}>
          Всего за неделю: {Math.round(weekHours * 10) / 10} ч ·{' '}
          {employees.length} сотрудников
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {days.map((d) => {
          const dayHours = byDay[d].reduce(
            (t, s) => t + shiftHours(s.start, s.end),
            0
          );
          const isToday = d === todayISO();
          const open = isOpen(d);
          return (
            <View key={d} style={styles.day}>
              <Pressable style={styles.dayHead} onPress={() => toggleDay(d)}>
                <Ionicons
                  name={open ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={colors.textMuted}
                />
                <Text style={[styles.dayName, isToday && styles.today]}>
                  {weekdayShort(d)}, {humanDate(d)}
                  {byDay[d].length > 0
                    ? `  ·  ${byDay[d].length} смен · ${
                        Math.round(dayHours * 10) / 10
                      } ч`
                    : ''}
                </Text>
                <View style={styles.flex} />
                <Pressable
                  hitSlop={10}
                  onPress={() => navigation.navigate('ShiftEdit', { date: d })}
                >
                  <Ionicons name="add-circle" size={28} color={colors.brand} />
                </Pressable>
              </Pressable>

              {!open ? null : byDay[d].length === 0 ? (
                <Text style={styles.free}>Смен нет</Text>
              ) : (
                byDay[d].map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() =>
                        navigation.navigate('ShiftEdit', { shiftId: s.id })
                      }
                    >
                      <Card style={styles.shift}>
                        <Avatar
                          name={emp?.name ?? '?'}
                          color={emp?.color ?? colors.textMuted}
                          size={34}
                        />
                        <View style={styles.flex}>
                          <Text style={styles.empName}>
                            {emp?.name ?? 'Удалён'}
                          </Text>
                          {s.position ? (
                            <Text style={styles.position}>{s.position}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.time}>
                          {s.start}–{s.end}
                        </Text>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  weekBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  range: { fontFamily: font.display, fontSize: 16, color: colors.text },
  navSpacer: { width: 24, height: 24 },
  sub: {
    fontFamily: font.semibold,
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  day: { marginBottom: 16 },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayName: { fontFamily: font.display, fontSize: 13, color: colors.text },
  today: { color: colors.brand },
  free: {
    fontFamily: font.medium,
    color: colors.textFaint,
    fontSize: 13,
    fontStyle: 'italic',
  },
  shift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  flex: { flex: 1 },
  empName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  position: { fontFamily: font.medium, fontSize: 13, color: colors.textMuted },
  time: { fontFamily: font.display, fontSize: 14, color: colors.brand },
});
