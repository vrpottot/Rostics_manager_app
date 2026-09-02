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
import { TeamStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Chip } from '../components';
import { Role, ROLE_LABEL } from '../types';

type Props = NativeStackScreenProps<TeamStackParams, 'EmployeeEdit'>;

export default function EmployeeEditScreen({ navigation, route }: Props) {
  const { employees, shifts, addEmployee, updateEmployee, removeEmployee } =
    useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editing = employees.find((e) => e.id === route.params?.employeeId);

  const [name, setName] = useState(editing?.name ?? '');
  const [role, setRole] = useState<Role>(editing?.role ?? 'crew');
  const [phone, setPhone] = useState(editing?.phone ?? '');

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Сотрудник' : 'Новый сотрудник' });
  }, [navigation, editing]);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Введите имя');
      return;
    }
    const payload = { name: name.trim(), role, phone: phone.trim() || undefined };
    if (editing) updateEmployee(editing.id, payload);
    else addEmployee(payload);
    navigation.goBack();
  };

  const confirmDelete = () => {
    const cnt = shifts.filter((s) => s.employeeId === editing?.id).length;
    Alert.alert(
      'Удалить сотрудника?',
      cnt ? `Будет удалено смен: ${cnt}` : undefined,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (editing) removeEmployee(editing.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Имя</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Фамилия Имя"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Роль</Text>
      <View style={styles.chips}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <Chip
            key={r}
            label={ROLE_LABEL[r]}
            active={role === r}
            onPress={() => setRole(r)}
          />
        ))}
      </View>

      <Text style={styles.label}>Телефон</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+7 ..."
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Сохранить</Text>
      </Pressable>
      {editing ? (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Удалить сотрудника</Text>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
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
