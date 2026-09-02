import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import {
  THEME_MODE_LABEL,
  ThemeMode,
  useTheme,
} from '../ThemeContext';
import { Colors, font } from '../theme';
import { Card, Field, PrimaryButton } from '../components';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileSettings'>;

type Tab = 'info' | 'security' | 'appearance';

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Профиль' },
  { key: 'security', label: 'Email и пароль' },
  { key: 'appearance', label: 'Оформление' },
];

const THEME_OPTIONS: {
  mode: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
}[] = [
  { mode: 'system', icon: 'phone-portrait-outline', hint: 'Следует за настройкой телефона' },
  { mode: 'light', icon: 'sunny-outline', hint: 'Всегда светлая' },
  { mode: 'dark', icon: 'moon-outline', hint: 'Всегда тёмная' },
];

export default function ProfileSettingsScreen(_: Props) {
  const { account, updateAccount, changePassword, logout } = useStore();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('info');

  const [name, setName] = useState(account?.name ?? '');
  const [restaurant, setRestaurant] = useState(account?.restaurantName ?? '');
  const [position, setPosition] = useState(account?.position ?? '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  if (!account) return null;

  const infoDirty =
    name.trim() !== account.name ||
    restaurant.trim() !== (account.restaurantName ?? '') ||
    position.trim() !== (account.position ?? '');

  const saveInfo = () => {
    if (!name.trim()) {
      setMsg({ text: 'Введите имя', ok: false });
      return;
    }
    updateAccount({ name, restaurantName: restaurant, position });
    setMsg({ text: 'Профиль сохранён', ok: true });
  };

  const savePassword = async () => {
    const res = await changePassword(cur, next);
    setMsg({ text: res.ok ? 'Пароль изменён' : res.error, ok: res.ok });
    if (res.ok) {
      setCur('');
      setNext('');
    }
  };

  const confirmLogout = () =>
    Alert.alert('Выйти из аккаунта?', 'Данные ресторана останутся на устройстве', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setMsg(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => switchTab(t.key)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {msg ? (
          <Text style={[styles.msg, msg.ok ? styles.msgOk : styles.msgErr]}>
            {msg.text}
          </Text>
        ) : null}

        {tab === 'info' && (
          <Card>
            <Field label="Имя и фамилия" value={name} onChangeText={setName} />
            <Field
              label="Должность"
              value={position}
              onChangeText={setPosition}
              placeholder="Например, Директор ресторана"
            />
            <Field
              label="Ресторан"
              value={restaurant}
              onChangeText={setRestaurant}
              placeholder="Необязательно"
            />
            <PrimaryButton
              title="Сохранить"
              onPress={saveInfo}
              disabled={!infoDirty}
            />
          </Card>
        )}

        {tab === 'security' && (
          <>
            <Text style={styles.section}>Email</Text>
            <Card>
              <Text style={styles.readonly}>{account.email}</Text>
              <Text style={styles.hint}>Email изменить нельзя</Text>
            </Card>
            <Text style={styles.section}>Смена пароля</Text>
            <Card>
              <Field
                label="Текущий пароль"
                value={cur}
                onChangeText={setCur}
                secure
              />
              <Field
                label="Новый пароль"
                value={next}
                onChangeText={setNext}
                secure
                placeholder="Минимум 6 символов"
              />
              <PrimaryButton
                title="Изменить пароль"
                onPress={savePassword}
                disabled={!cur || !next}
              />
            </Card>
          </>
        )}

        {tab === 'appearance' && (
          <>
            <Text style={styles.section}>Тема</Text>
            <View style={styles.group}>
              {THEME_OPTIONS.map((o, i) => {
                const selected = mode === o.mode;
                return (
                  <Pressable
                    key={o.mode}
                    style={[styles.row, i > 0 && styles.rowBorder]}
                    onPress={() => setMode(o.mode)}
                  >
                    <Ionicons name={o.icon} size={20} color={colors.text} />
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>
                        {THEME_MODE_LABEL[o.mode]}
                      </Text>
                      <Text style={styles.hint}>{o.hint}</Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.brand}
                      />
                    ) : (
                      <View style={styles.radio} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable style={styles.logout} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    tabsWrap: {
      flexGrow: 0,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabs: { paddingHorizontal: 12 },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabOn: { borderBottomColor: colors.brand },
    tabText: { fontFamily: font.semibold, fontSize: 14, color: colors.textMuted },
    tabTextOn: { color: colors.brand, fontFamily: font.bold },
    content: { padding: 18, paddingBottom: 40 },
    msg: {
      borderRadius: 10,
      padding: 11,
      fontSize: 13,
      fontFamily: font.semibold,
      marginBottom: 12,
    },
    msgOk: { backgroundColor: colors.successTint, color: colors.success },
    msgErr: { backgroundColor: colors.brandTint, color: colors.brand },
    section: {
      fontFamily: font.bold,
      fontSize: 12,
      letterSpacing: 0.4,
      color: colors.textFaint,
      textTransform: 'uppercase',
      marginTop: 6,
      marginBottom: 8,
      marginLeft: 4,
    },
    readonly: { fontFamily: font.medium, fontSize: 15, color: colors.text },
    hint: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textFaint,
      marginTop: 4,
    },
    group: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 15,
      paddingHorizontal: 16,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    flex: { flex: 1 },
    rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
    },
    logout: { alignItems: 'center', paddingVertical: 18, marginTop: 20 },
    logoutText: { color: colors.brand, fontSize: 15, fontFamily: font.bold },
  });
