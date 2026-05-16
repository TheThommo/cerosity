import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConsoleThemeTokens, darkTheme, lightTheme } from './console-theme';

type ThemeMode = 'dark' | 'light';

interface ConsoleThemeContextValue {
  theme: ConsoleThemeTokens;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ConsoleThemeContext = createContext<ConsoleThemeContextValue>({
  theme: darkTheme,
  mode: 'dark',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'cerosity-hq-theme';

export function ConsoleThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  function toggleTheme() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-console-theme', mode);
  }, [mode]);

  return (
    <ConsoleThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ConsoleThemeContext.Provider>
  );
}

export function useConsoleTheme(): ConsoleThemeContextValue {
  return useContext(ConsoleThemeContext);
}
