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

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, account } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>Ростикс</Text>
          <Text style={styles.title}>Вход для менеджера</Text>
          {account?.restaurantName ? (
            <Text style={styles.subtitle}>{account.restaurantName}</Text>
          ) : (
            <View style={{ height: 12 }} />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
            placeholder="Ваш пароль"
            secure
          />

          <View style={{ height: 8 }} />
          <PrimaryButton
            title={busy ? 'Вход…' : 'Войти'}
            onPress={submit}
            disabled={!email || !password || busy}
          />

          {!account ? (
            <Pressable
              style={styles.linkRow}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkMuted}>Нет аккаунта? </Text>
              <Text style={styles.link}>Зарегистрироваться</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 26, paddingTop: 64 },
  logo: {
    fontFamily: font.display,
    fontSize: 24,
    color: colors.brand,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: font.display,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.text,
    marginTop: 28,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 20,
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
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  linkMuted: { fontFamily: font.regular, color: colors.textMuted, fontSize: 14 },
  link: { fontFamily: font.semibold, color: colors.brand, fontSize: 14 },
});
