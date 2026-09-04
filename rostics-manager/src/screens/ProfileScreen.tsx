import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ProfileStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font, shiftColors } from '../theme';
import { Avatar, Card, Hero } from '../components';
import {
  MANAGER_SHIFT_LABEL,
  MANAGER_SHIFT_ORDER,
  ManagerShiftType,
} from '../types';
import {
  parseManagerMonthlySchedule,
  parseManagerSchedule,
} from '../lib/scheduleImport';
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
  const {
    account,
    managerSchedule,
    setManagerShift,
    importManagerSchedule,
    importTeam,
    importShifts,
  } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  // Alert с кнопками не работает в react-native-web — на вебе спрашиваем через confirm.
  const confirmImport = (message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(
        typeof window !== 'undefined' ? window.confirm(message) : true
      );
    }
    return new Promise((resolve) => {
      Alert.alert('Импорт графика', message, [
        { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Загрузить', onPress: () => resolve(true) },
      ]);
    });
  };

  /** Выбор .xlsx и чтение его содержимого. null — пользователь отменил. */
  const pickSpreadsheet = async (): Promise<Uint8Array | string | null> => {
    let res: DocumentPicker.DocumentPickerResult;
    try {
      res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
    } catch (e) {
      console.warn(e);
      return null;
    }
    if (res.canceled || !res.assets?.[0]) return null;
    const asset = res.assets[0];
    if (Platform.OS === 'web') {
      const buf = await (await fetch(asset.uri)).arrayBuffer();
      return new Uint8Array(buf);
    }
    // legacy API читает URI от DocumentPicker без проблем со scoped storage
    return FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
  };

  /** «Расписание MNG …» — личный график менеджера сразу на все месяцы файла. */
  const importOwnSchedule = async () => {
    if (!account || importing) return;
    setImportMsg(null);
    const data = await pickSpreadsheet();
    if (data == null) return;

    setImporting(true);
    try {
      const parsed = parseManagerMonthlySchedule(data, account.name);

      if (!parsed.matched) {
        setImportMsg({
          text: `Не нашёл в файле строку с вашим именем «${account.name}» (нужны имя и фамилия как в таблице). Имена в файле: ${parsed.names
            .slice(0, 15)
            .join(', ')}`,
          ok: false,
        });
        return;
      }
      // берём только смены с начала текущей недели — прошлые месяцы не нужны
      const cutoff = toISODate(startOfWeek(new Date()));
      const shifts = parsed.shifts.filter((s) => s.date >= cutoff);
      if (!shifts.length) {
        setImportMsg({
          text: `Нашёл вас как «${parsed.matchedName}», но смен с ${humanDate(
            cutoff
          )} в файле нет.`,
          ok: false,
        });
        return;
      }

      const first = shifts[0].date;
      const last = shifts[shifts.length - 1].date;
      const months = new Set(shifts.map((s) => s.date.slice(0, 7))).size;
      const go = await confirmImport(
        `Вы в таблице: «${parsed.matchedName}». Смен: ${shifts.length} за ${months} мес. (${humanDate(
          first
        )} – ${humanDate(last)}).\n\nВаш текущий график будет полностью заменён данными из файла.`
      );
      if (!go) return;

      const n = await importManagerSchedule(shifts);
      setWeekStart(startOfWeek(new Date(first + 'T00:00:00')));
      setImportMsg({
        text: `Готово. Загружено смен: ${n} за ${months} мес.`,
        ok: true,
      });
    } catch (e) {
      console.warn(e);
      setImportMsg({ text: 'Не удалось загрузить график из файла.', ok: false });
    } finally {
      setImporting(false);
    }
  };

  /** «Пожелания …» — команда и «График смен» всех сотрудников по всем неделям. */
  const importTeamSchedule = async () => {
    if (!account || importing) return;
    setImportMsg(null);
    const data = await pickSpreadsheet();
    if (data == null) return;

    setImporting(true);
    try {
      const parsed = parseManagerSchedule(data, account.name);
      if (!parsed.teamShifts.length && !parsed.team.length) {
        setImportMsg({
          text: 'В файле не нашлось сотрудников со сменами. Нужен файл «Пожелания …».',
          ok: false,
        });
        return;
      }

      // только текущая неделя и позже — прошлые недели из файла не нужны
      const cutoff = toISODate(startOfWeek(new Date()));
      const teamShifts = parsed.teamShifts.filter((s) => s.date >= cutoff);
      if (!teamShifts.length) {
        setImportMsg({
          text: `В файле нет смен сотрудников с ${humanDate(cutoff)}.`,
          ok: false,
        });
        return;
      }
      // сотрудники — только те, у кого есть смены в этой неделе
      const withShifts = new Set(teamShifts.map((s) => s.name.trim().toLowerCase()));
      const team = parsed.team.filter((e) =>
        withShifts.has(e.name.trim().toLowerCase())
      );

      const dates = teamShifts.map((s) => s.date).sort();
      const range = ` (${humanDate(dates[0])} – ${humanDate(
        dates[dates.length - 1]
      )})`;
      const go = await confirmImport(
        `Сотрудников: ${team.length}, их смен: ${teamShifts.length}${range}.\n\n` +
          'Новые сотрудники добавятся в «Команду», смены на эти даты в «Графике смен» будут заменены.'
      );
      if (!go) return;

      const added = await importTeam(team);
      const teamShiftCount = await importShifts(teamShifts);
      setImportMsg({
        text: `Готово. Сотрудников добавлено: ${added}. Смен в графике: ${teamShiftCount}.`,
        ok: true,
      });
    } catch (e) {
      console.warn(e);
      setImportMsg({
        text: 'Не удалось загрузить график сотрудников из файла.',
        ok: false,
      });
    } finally {
      setImporting(false);
    }
  };

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))),
    [weekStart]
  );

  // раньше текущей недели листать нельзя — график начинается с неё
  const minWeek = useMemo(() => toISODate(startOfWeek(new Date())), []);

  const weekHours = days.reduce((sum, date) => {
    const entry = managerSchedule[date];
    if (!entry) return sum;
    return sum + shiftHours(entry.start, entry.end);
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
          <Avatar
            name={account.name}
            color={colors.brand}
            size={54}
            uri={account.avatarUrl}
          />
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
            {days[0] > minWeek ? (
              <Pressable
                hitSlop={10}
                onPress={() => setWeekStart((w) => addDays(w, -7))}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.navSpacer} />
            )}
            <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))}>
              <Text style={styles.range}>{rangeLabel}</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => setWeekStart((w) => addDays(w, 7))}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>

          {days[0] !== minWeek ? (
            <Pressable
              style={styles.todayBtn}
              onPress={() => setWeekStart(startOfWeek(new Date()))}
            >
              <Ionicons name="today-outline" size={15} color={colors.brand} />
              <Text style={styles.todayBtnText}>Текущая неделя</Text>
            </Pressable>
          ) : null}

          {days.map((date) => {
            const entry = managerSchedule[date] ?? null;
            const type = entry?.type ?? null;
            const isToday = date === todayISO();
            const time = entry ? [entry.start, entry.end] : null;
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

        <Pressable
          style={[styles.importBtn, importing && { opacity: 0.6 }]}
          onPress={importOwnSchedule}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <>
              <Ionicons name="person-outline" size={18} color={colors.brand} />
              <Text style={styles.importText}>Загрузить свой график</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[
            styles.importBtn,
            styles.importBtnSecondary,
            importing && { opacity: 0.6 },
          ]}
          onPress={importTeamSchedule}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <>
              <Ionicons name="people-outline" size={18} color={colors.brand} />
              <Text style={styles.importText}>Загрузить график сотрудников</Text>
            </>
          )}
        </Pressable>
        {importMsg ? (
          <Text
            style={[
              styles.importMsg,
              importMsg.ok ? styles.importMsgOk : styles.importMsgErr,
            ]}
          >
            {importMsg.text}
          </Text>
        ) : null}
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
  navSpacer: { width: 22, height: 22 },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.brandTint,
    marginBottom: 6,
  },
  todayBtnText: { fontFamily: font.bold, fontSize: 12, color: colors.brand },
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
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  importBtnSecondary: {
    backgroundColor: 'transparent',
    marginTop: 10,
  },
  importText: { fontFamily: font.bold, fontSize: 14, color: colors.brand },
  importMsg: {
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
    fontSize: 13,
    fontFamily: font.semibold,
    lineHeight: 18,
  },
  importMsgOk: { backgroundColor: colors.successTint, color: colors.success },
  importMsgErr: { backgroundColor: colors.brandTint, color: colors.brand },
  hint: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 10,
    lineHeight: 17,
  },
  link: { fontFamily: font.semibold, color: colors.brand },
});
