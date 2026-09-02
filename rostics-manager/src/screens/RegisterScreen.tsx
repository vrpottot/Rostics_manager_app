import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Field, PrimaryButton } from '../components';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    const res = await register({
      name,
      email,
      password,
      restaurantName: restaurant,
    });
    setBusy(false);
    if (!res.ok) setError(res.error);
    // при успехе StoreProvider переключит на основной экран
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>Ростикс</Text>
          <Text style={styles.title}>Регистрация менеджера</Text>
          <Text style={styles.subtitle}>
            Аккаунт создаётся один раз для этого ресторана
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Field
            label="Имя и фамилия"
            value={name}
            onChangeText={setName}
            placeholder="Иван Смирнов"
            autoCapitalize="words"
          />
          <Field
            label="Ресторан (необязательно)"
            value={restaurant}
            onChangeText={setRestaurant}
            placeholder="Ростикс, ТЦ Мега"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="manager@example.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            secure
          />
          <Field
            label="Повторите пароль"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Ещё раз"
            secure
          />

          <View style={{ height: 8 }} />
          <PrimaryButton
            title={busy ? 'Создание…' : 'Зарегистрироваться'}
            onPress={submit}
            disabled={!name || !email || !password || !confirm || busy}
          />

          <Pressable
            style={styles.linkRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkMuted}>Уже есть аккаунт? </Text>
            <Text style={styles.link}>Войти</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 26, paddingTop: 40 },
  logo: {
    fontFamily: font.display,
    fontSize: 22,
    color: colors.brand,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: font.display,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.text,
    marginTop: 18,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 18,
  },
  error: {
    backgroundColor: colors.brandTint,
    color: colors.brand,
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
    marginBottom: 14,
    fontFamily: font.semibold,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkMuted: { fontFamily: font.regular, color: colors.textMuted, fontSize: 14 },
  link: { fontFamily: font.semibold, color: colors.brand, fontSize: 14 },
});
