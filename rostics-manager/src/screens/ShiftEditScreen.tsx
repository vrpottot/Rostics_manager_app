import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScheduleStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Avatar } from '../components';
import {
  addDays,
  confirmAsync,
  fromISODate,
  humanDate,
  isValidTime,
  shiftHours,
  toISODate,
  todayISO,
  weekdayShort,
} from '../utils';

type Props = NativeStackScreenProps<ScheduleStackParams, 'ShiftEdit'>;

const PRESETS = ['Касса', 'Кухня', 'Зал', 'Драйв', 'Экспедитор'];

export default function ShiftEditScreen({ navigation, route }: Props) {
  const { shifts, employees, addShift, updateShift, removeShift } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editing = shifts.find((s) => s.id === route.params?.shiftId);

  const [employeeId, setEmployeeId] = useState(
    editing?.employeeId ?? employees[0]?.id ?? ''
  );
  const [date, setDate] = useState(
    editing?.date ?? route.params?.date ?? todayISO()
  );
  const [start, setStart] = useState(editing?.start ?? '09:00');
  const [end, setEnd] = useState(editing?.end ?? '18:00');
  const [position, setPosition] = useState(editing?.position ?? '');
  const [note, setNote] = useState(editing?.note ?? '');

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Смена' : 'Новая смена' });
  }, [navigation, editing]);

  const timesOk = isValidTime(start) && isValidTime(end);
  const hours = timesOk ? shiftHours(start, end) : 0;

  const save = () => {
    if (!employeeId) {
      Alert.alert('Сначала добавьте сотрудника во вкладке «Команда»');
      return;
    }
    if (!timesOk) {
      Alert.alert('Проверьте время', 'Формат ЧЧ:ММ, например 09:30');
      return;
    }
    const payload = {
      employeeId,
      date,
      start: start.trim(),
      end: end.trim(),
      position: position.trim() || undefined,
      note: note.trim() || undefined,
    };
    if (editing) updateShift(editing.id, payload);
    else addShift(payload);
    navigation.goBack();
  };

  const confirmDelete = async () => {
    if (!(await confirmAsync('Удалить смену?', undefined, 'Удалить', true))) return;
    if (editing) removeShift(editing.id);
    navigation.goBack();
  };

  const shiftDate = (delta: number) =>
    setDate((d) => toISODate(addDays(fromISODate(d), delta)));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Сотрудник</Text>
      <View style={styles.chips}>
        {employees.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEmployeeId(e.id)}
            style={[
              styles.personChip,
              employeeId === e.id && {
                borderColor: e.color,
                backgroundColor: colors.brandTint,
              },
            ]}
          >
            <Avatar name={e.name} color={e.color} size={22} />
            <Text style={styles.personName}>{e.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Дата</Text>
      <View style={styles.dateRow}>
        <Pressable hitSlop={10} onPress={() => shiftDate(-1)}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.dateText}>
          {weekdayShort(date)}, {humanDate(date)}
        </Text>
        <Pressable hitSlop={10} onPress={() => shiftDate(1)}>
          <Ionicons name="chevron-forward" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.flex}>
          <Text style={styles.label}>Начало</Text>
          <TextInput
            style={styles.input}
            value={start}
            onChangeText={setStart}
            placeholder="09:00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>Конец</Text>
          <TextInput
            style={styles.input}
            value={end}
            onChangeText={setEnd}
            placeholder="18:00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      </View>
      <Text style={styles.hours}>
        {timesOk ? `Длительность: ${hours} ч` : 'Введите время в формате ЧЧ:ММ'}
      </Text>

      <Text style={styles.label}>Позиция</Text>
      <TextInput
        style={styles.input}
        value={position}
        onChangeText={setPosition}
        placeholder="Например, Касса"
        placeholderTextColor={colors.textMuted}
      />
      <View style={styles.chips}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPosition(p)}
            style={styles.presetChip}
          >
            <Text style={styles.presetText}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Заметка</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={note}
        onChangeText={setNote}
        placeholder="Необязательно"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Сохранить</Text>
      </Pressable>
      {editing ? (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Удалить смену</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  label: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textFaint,
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  personName: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  timeRow: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: font.regular,
    color: colors.text,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  hours: {
    fontFamily: font.regular,
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.card,
  },
  presetText: { fontFamily: font.regular, fontSize: 13, color: colors.text },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveText: { color: '#fff', fontSize: 16, fontFamily: font.semibold },
  deleteBtn: { alignItems: 'center', paddingVertical: 15, marginTop: 4 },
  deleteText: { color: colors.brand, fontSize: 15, fontFamily: font.semibold },
});
