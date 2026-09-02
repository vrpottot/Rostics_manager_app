import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { Colors, darkColors, lightColors } from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_LABEL: Record<ThemeMode, string> = {
  system: 'Как в системе',
  light: 'Светлая',
  dark: 'Тёмная',
};

const KEY = 'rostics-manager/theme';

interface ThemeValue {
  colors: Colors;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  ready: boolean;
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY);
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      } catch (e) {
        console.warn('theme load failed', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch((e) => console.warn('theme save failed', e));
  };

  const value = useMemo<ThemeValue>(() => {
    const scheme: 'light' | 'dark' =
      mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return {
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      mode,
      setMode,
      ready,
    };
  }, [mode, system, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
