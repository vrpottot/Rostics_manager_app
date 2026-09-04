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
import { TasksStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Chip } from '../components';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  isRecurringCategory,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../types';
import { confirmAsync } from '../utils';

type Props = NativeStackScreenProps<TasksStackParams, 'TaskEdit'>;

export default function TaskEditScreen({ navigation, route }: Props) {
  const { tasks, addTask, updateTask, removeTask } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editing = tasks.find((t) => t.id === route.params?.taskId);

  const [category, setCategory] = useState<TaskCategory>(
    editing?.category ?? route.params?.category ?? 'shift'
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(editing?.priority ?? 'med');
  const [status, setStatus] = useState<TaskStatus>(editing?.status ?? 'open');

  const isRecurring = isRecurringCategory(category);

  useLayoutEffect(() => {
    const noun = category === 'opening' ? 'открытия' : 'закрытия';
    navigation.setOptions({
      title: editing
        ? isRecurring
          ? `Пункт ${noun}`
          : 'Задача'
        : isRecurring
        ? `Новый пункт ${noun}`
        : 'Новая задача',
    });
  }, [navigation, editing, isRecurring, category]);

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Введите название');
      return;
    }
    const payload = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      priority: isRecurring ? ('med' as const) : priority,
      assigneeId: null,
      dueDate: null,
    };
    if (editing) {
      updateTask(editing.id, {
        ...payload,
        status: isRecurring ? 'open' : status,
        completedAt:
          !isRecurring && status === 'done'
            ? editing.completedAt ?? new Date().toISOString()
            : null,
      });
    } else {
      addTask({ ...payload, status: isRecurring ? 'open' : status });
    }
    navigation.goBack();
  };

  const confirmDelete = async () => {
    if (!(await confirmAsync('Удалить?', title, 'Удалить', true))) return;
    if (editing) removeTask(editing.id);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Раздел</Text>
      <View style={styles.chips}>
        {CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABEL[c]}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      {isRecurring ? (
        <Text style={styles.hint}>
          Пункт чек-листа «{CATEGORY_LABEL[category]}». Появляется в графике
          каждый день, выполнение отмечается по датам.
        </Text>
      ) : null}

      <Text style={styles.label}>Название</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Что нужно сделать"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Описание</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Детали, необязательно"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      {!isRecurring && (
        <>
          <Text style={styles.label}>Приоритет</Text>
          <View style={styles.chips}>
            {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <Chip
                key={p}
                label={PRIORITY_LABEL[p]}
                active={priority === p}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>

          <Text style={styles.label}>Статус</Text>
          <View style={styles.chips}>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <Chip
                key={s}
                label={STATUS_LABEL[s]}
                active={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </View>
        </>
      )}

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Сохранить</Text>
      </Pressable>

      {editing ? (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Удалить</Text>
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
    hint: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 17,
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
    multiline: { minHeight: 76, textAlignVertical: 'top' },
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
