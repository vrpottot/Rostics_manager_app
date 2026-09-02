import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { cardShadow, Colors, font } from './theme';

function useStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors]);
}

export function Hero({
  title,
  subtitle,
  right,
  titleSize,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  titleSize?: number;
}) {
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <SafeAreaView edges={['top']}>
        <View style={styles.heroRow}>
          <Text
            style={[
              styles.heroTitle,
              titleSize ? { fontSize: titleSize, lineHeight: titleSize * 1.15 } : null,
            ]}
          >
            {title}
          </Text>
          {right}
        </View>
        {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      </SafeAreaView>
    </View>
  );
}

export function Field({
  label,
  secure,
  ...props
}: TextInputProps & { label: string; secure?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.fieldRow}>
        <TextInput
          style={styles.fieldInput}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textFaint}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      style={[styles.primaryBtn, disabled && { opacity: 0.45 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const activeBg = color ?? colors.ink;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: activeBg, borderColor: activeBg }]}
    >
      <Text
        style={[styles.chipText, { color: active ? colors.onInk : colors.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: font.display, fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );
}

export function FAB({
  onPress,
  icon = 'add',
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useStyles();
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
}

export function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.textFaint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.brand,
      paddingHorizontal: 22,
      paddingBottom: 22,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    heroTitle: {
      fontFamily: font.display,
      fontSize: 30,
      letterSpacing: -0.5,
      color: '#fff',
      flexShrink: 1,
      paddingRight: 12,
    },
    heroSub: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.heroSub,
      marginTop: 6,
    },
    field: { marginBottom: 12 },
    fieldLabel: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    fieldInput: {
      flex: 1,
      paddingVertical: 13,
      fontSize: 15,
      fontFamily: font.medium,
      color: colors.text,
    },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryText: { color: '#fff', fontSize: 16, fontFamily: font.display },
    chip: {
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      marginBottom: 8,
    },
    chipText: { fontSize: 13, fontFamily: font.semibold },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 26,
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: colors.brand,
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
    },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      fontFamily: font.medium,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
    },
  });
