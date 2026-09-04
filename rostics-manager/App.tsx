import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { StoreProvider, useStore } from './src/store';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { Colors, font } from './src/theme';
import {
  AuthStackParams,
  ProfileStackParams,
  ScheduleStackParams,
  TasksStackParams,
  TeamStackParams,
} from './src/navigation';

import TasksScreen from './src/screens/TasksScreen';
import TaskEditScreen from './src/screens/TaskEditScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ShiftEditScreen from './src/screens/ShiftEditScreen';
import TeamScreen from './src/screens/TeamScreen';
import EmployeeEditScreen from './src/screens/EmployeeEditScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';

const Tab = createBottomTabNavigator();
const AuthNav = createNativeStackNavigator<AuthStackParams>();
const TasksNav = createNativeStackNavigator<TasksStackParams>();
const ScheduleNav = createNativeStackNavigator<ScheduleStackParams>();
const TeamNav = createNativeStackNavigator<TeamStackParams>();
const ProfileNav = createNativeStackNavigator<ProfileStackParams>();

function useHeaderStyle() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.brand },
    headerTintColor: '#fff',
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: font.semibold, fontSize: 17 },
  };
}

function TasksStack() {
  const headerStyle = useHeaderStyle();
  return (
    <TasksNav.Navigator screenOptions={headerStyle}>
      <TasksNav.Screen
        name="TasksList"
        component={TasksScreen}
        options={{ headerShown: false }}
      />
      <TasksNav.Screen name="TaskEdit" component={TaskEditScreen} />
    </TasksNav.Navigator>
  );
}

function ScheduleStack() {
  const headerStyle = useHeaderStyle();
  return (
    <ScheduleNav.Navigator screenOptions={headerStyle}>
      <ScheduleNav.Screen
        name="ScheduleWeek"
        component={ScheduleScreen}
        options={{ headerShown: false }}
      />
      <ScheduleNav.Screen name="ShiftEdit" component={ShiftEditScreen} />
    </ScheduleNav.Navigator>
  );
}

function TeamStack() {
  const headerStyle = useHeaderStyle();
  return (
    <TeamNav.Navigator screenOptions={headerStyle}>
      <TeamNav.Screen
        name="TeamList"
        component={TeamScreen}
        options={{ headerShown: false }}
      />
      <TeamNav.Screen name="EmployeeEdit" component={EmployeeEditScreen} />
    </TeamNav.Navigator>
  );
}

function ProfileStack() {
  const headerStyle = useHeaderStyle();
  return (
    <ProfileNav.Navigator screenOptions={headerStyle}>
      <ProfileNav.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileNav.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: 'Настройки' }}
      />
    </ProfileNav.Navigator>
  );
}

function AuthStack() {
  const { account } = useStore();
  return (
    <AuthNav.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={account ? 'Login' : 'Register'}
    >
      <AuthNav.Screen name="Login" component={LoginScreen} />
      <AuthNav.Screen name="Register" component={RegisterScreen} />
    </AuthNav.Navigator>
  );
}

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11, marginTop: 2 },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Задачи: 'checkbox-outline',
            График: 'calendar-outline',
            Команда: 'people-outline',
            Профиль: 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Задачи" component={TasksStack} />
      <Tab.Screen name="График" component={ScheduleStack} />
      <Tab.Screen name="Команда" component={TeamStack} />
      <Tab.Screen name="Профиль" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function Loading({ colors }: { colors: Colors }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
      }}
    >
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

function Root() {
  const { ready, isAuthed, account, logout } = useStore();
  const { colors } = useTheme();
  if (!ready) return <Loading colors={colors} />;
  if (!isAuthed) return <AuthStack />;
  if (!account) return <NoProfile colors={colors} onLogout={logout} />;
  return <Tabs />;
}

function NoProfile({
  colors,
  onLogout,
}: {
  colors: Colors;
  onLogout: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        padding: 32,
        gap: 16,
      }}
    >
      <Ionicons name="person-remove-outline" size={48} color={colors.textFaint} />
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 16,
          color: colors.text,
          textAlign: 'center',
        }}
      >
        Профиль не найден
      </Text>
      <Text
        style={{
          fontFamily: font.medium,
          fontSize: 13,
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 19,
        }}
      >
        Аккаунт есть, но данные ресторана удалены. Зарегистрируйтесь заново или
        войдите под другим аккаунтом.
      </Text>
      <Pressable
        onPress={onLogout}
        style={{
          marginTop: 8,
          backgroundColor: colors.brand,
          borderRadius: 14,
          paddingVertical: 13,
          paddingHorizontal: 28,
        }}
      >
        <Text style={{ color: '#fff', fontFamily: font.display, fontSize: 15 }}>
          Выйти
        </Text>
      </Pressable>
    </View>
  );
}

function Shell() {
  const { colors, scheme, ready } = useTheme();
  if (!ready) return <Loading colors={colors} />;

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.brand,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Root />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {fontsLoaded ? (
          <StoreProvider>
            <Shell />
          </StoreProvider>
        ) : (
          <FontGate />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function FontGate() {
  const { colors } = useTheme();
  return <Loading colors={colors} />;
}
