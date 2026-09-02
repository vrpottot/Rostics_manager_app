import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font, shiftColors } from '../theme';
import { Avatar, Card, Hero } from '../components';
import {
  MANAGER_SHIFT_LABEL,
  MANAGER_SHIFT_ORDER,
  ManagerShiftType,
  SHIFT_TIMES,
} from '../types';
import {
  addDays,
  humanDate,
  shiftHours,
  startOfWeek,
  toISODate,
  todayISO,
  weekdayShort,
} from '../utils';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileMain'>;

const SHIFT_COLOR = shiftColors;

/** morning -> day -> evening -> выходной -> morning */
function nextType(t: ManagerShiftType | null): ManagerShiftType | null {
  if (t === null) return MANAGER_SHIFT_ORDER[0];
  const i = MANAGER_SHIFT_ORDER.indexOf(t);
  return i === MANAGER_SHIFT_ORDER.length - 1 ? null : MANAGER_SHIFT_ORDER[i + 1];
}

export default function ProfileScreen({ navigation }: Props) {
  const { account, managerSchedule, setManagerShift } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))),
    [weekStart]
  );

  const weekHours = days.reduce((sum, date) => {
    const type = managerSchedule[date];
    if (!type) return sum;
    const [s, e] = SHIFT_TIMES[type];
    return sum + shiftHours(s, e);
  }, 0);
  const workDays = days.filter((d) => managerSchedule[d]).length;

  if (!account) return null;

  const rangeLabel = `${humanDate(days[0])} – ${humanDate(days[6])}`;

  return (
    <View style={styles.safe}>
      <Hero
        title="Профиль"
        right={
          <Pressable
            hitSlop={12}
            style={styles.gear}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.head}>
          <Avatar name={account.name} color={colors.brand} size={54} />
          <View style={styles.flex}>
            <Text style={styles.name}>{account.name}</Text>
            <Text style={styles.email}>{account.email}</Text>
            {account.position ? (
              <Text style={styles.since}>{account.position}</Text>
            ) : (
              <Text
                style={styles.placeholder}
                onPress={() => navigation.navigate('ProfileSettings')}
              >
                Должность не указана — добавить
              </Text>
            )}
          </View>
        </Card>

        <Text style={styles.section}>Мой график по неделям</Text>
        <Card>
          <View style={styles.weekNav}>
            <Pressable hitSlop={10} onPress={() => setWeekStart((w) => addDays(w, -7))}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))}>
              <Text style={styles.range}>{rangeLabel}</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => setWeekStart((w) => addDays(w, 7))}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>

          {days.map((date) => {
            const type = managerSchedule[date] ?? null;
            const isToday = date === todayISO();
            const time = type ? SHIFT_TIMES[type] : null;
            return (
              <Pressable
                key={date}
                style={[styles.dayRow, isToday && styles.dayRowToday]}
                onPress={() => setManagerShift(date, nextType(type))}
              >
                <Text style={[styles.dayLabel, isToday && styles.today]}>
                  {weekdayShort(date)}, {humanDate(date)}
                </Text>
                {type ? (
                  <View style={styles.shiftInfo}>
                    <View
                      style={[styles.badge, { backgroundColor: SHIFT_COLOR[type] }]}
                    >
                      <Text style={styles.badgeText}>
                        {MANAGER_SHIFT_LABEL[type]}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>
                      {time![0]}–{time![1]}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.dayOff}>Выходной</Text>
                )}
              </Pressable>
            );
          })}

          <Text style={styles.total}>
            {workDays} раб. дн. · {Math.round(weekHours * 10) / 10} ч за неделю
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  gear: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 18, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  flex: { flex: 1 },
  name: { fontFamily: font.display, fontSize: 18, color: colors.text },
  email: { fontFamily: font.medium, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  since: { fontFamily: font.medium, fontSize: 12, color: colors.textFaint, marginTop: 6 },
  section: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textFaint,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  placeholder: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.brand,
    marginTop: 6,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  range: { fontFamily: font.display, fontSize: 15, color: colors.text },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayRowToday: {
    backgroundColor: colors.brandTint,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  dayLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  today: { color: colors.brand },
  shiftInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: font.bold },
  timeText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  dayOff: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.textFaint,
    fontStyle: 'italic',
  },
  total: {
    fontFamily: font.bold,
    fontSize: 13,
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  hint: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 10,
    lineHeight: 17,
  },
  link: { fontFamily: font.semibold, color: colors.brand },
});
