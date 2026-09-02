import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TeamStackParams } from '../navigation';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { Colors, font } from '../theme';
import { Avatar, Card, EmptyState, FAB, Hero } from '../components';
import { ROLE_LABEL } from '../types';

type Props = NativeStackScreenProps<TeamStackParams, 'TeamList'>;

function plural(n: number) {
  const d = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return 'сотрудников';
  if (d === 1) return 'сотрудник';
  if (d >= 2 && d <= 4) return 'сотрудника';
  return 'сотрудников';
}

export default function TeamScreen({ navigation }: Props) {
  const { employees } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.safe}>
      <Hero
        title="Команда"
        subtitle={`${employees.length} ${plural(employees.length)}`}
      />

      {employees.length === 0 ? (
        <EmptyState icon="people-outline" text="Добавьте сотрудников ресторана" />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {employees.map((e) => (
            <Pressable
              key={e.id}
              onPress={() =>
                navigation.navigate('EmployeeEdit', { employeeId: e.id })
              }
            >
              <Card>
                <View style={styles.row}>
                  <Avatar name={e.name} color={e.color} size={44} />
                  <View style={styles.flex}>
                    <Text style={styles.name}>{e.name}</Text>
                    <View
                      style={[
                        styles.pill,
                        e.role === 'trainee' && {
                          backgroundColor: colors.warningTint,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          e.role === 'trainee' && { color: colors.warning },
                        ]}
                      >
                        {ROLE_LABEL[e.role]}
                      </Text>
                    </View>
                  </View>
                  {e.phone ? <Text style={styles.phone}>{e.phone}</Text> : null}
                </View>
              </Card>
            </Pressable>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <FAB onPress={() => navigation.navigate('EmployeeEdit', {})} />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 18, paddingTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  name: { fontFamily: font.display, fontSize: 15, color: colors.text },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.subtle,
  },
  pillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.3, color: colors.textMuted },
  phone: { fontFamily: font.semibold, fontSize: 13, color: colors.textMuted },
});
