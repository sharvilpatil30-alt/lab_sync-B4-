import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'default' | 'gold-pink';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isGoldPink: boolean;
  isInstagram: boolean; // alias for backwards compatibility
}

const THEME_STORAGE_KEY = 'smart_campus_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'gold-pink' || saved === 'instagram') {
        return 'gold-pink';
      }
      if (saved === 'default') {
        return 'default';
      }
    } catch {
      // LocalStorage access fallback
    }
    return 'default';
  });

  const applyThemeClasses = (t: AppTheme) => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', t);

    if (t === 'gold-pink') {
      root.classList.add('theme-gold-pink');
      body.classList.add('theme-gold-pink');
      root.classList.remove('theme-instagram');
      body.classList.remove('theme-instagram');
    } else {
      root.classList.remove('theme-gold-pink');
      body.classList.remove('theme-gold-pink');
      root.classList.remove('theme-instagram');
      body.classList.remove('theme-instagram');
    }
  };

  useEffect(() => {
    applyThemeClasses(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failure
    }
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'default' ? 'gold-pink' : 'default'));
  };

  const isGoldPink = theme === 'gold-pink';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isGoldPink,
        isInstagram: isGoldPink,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
