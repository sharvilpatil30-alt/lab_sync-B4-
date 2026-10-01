import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'default' | 'gold-pink' | 'emerald-mint';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isGoldPink: boolean;
  isEmeraldMint: boolean;
  isOceanCyan: boolean;
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
      if (saved === 'emerald-mint') {
        return 'emerald-mint';
      }
      if (saved === 'default' || saved === 'ocean-cyan') {
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

    root.classList.remove('theme-gold-pink', 'theme-instagram', 'theme-emerald-mint', 'theme-ocean-cyan');
    body.classList.remove('theme-gold-pink', 'theme-instagram', 'theme-emerald-mint', 'theme-ocean-cyan');

    if (t === 'gold-pink') {
      root.classList.add('theme-gold-pink');
      body.classList.add('theme-gold-pink');
    } else if (t === 'emerald-mint') {
      root.classList.add('theme-emerald-mint');
      body.classList.add('theme-emerald-mint');
    } else {
      // Default: Midnight Ocean & Electric Cyan
      root.classList.add('theme-ocean-cyan');
      body.classList.add('theme-ocean-cyan');
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
    setThemeState((prev) => {
      if (prev === 'default') return 'gold-pink';
      if (prev === 'gold-pink') return 'emerald-mint';
      return 'default';
    });
  };

  const isGoldPink = theme === 'gold-pink';
  const isEmeraldMint = theme === 'emerald-mint';
  const isOceanCyan = theme === 'default';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isGoldPink,
        isEmeraldMint,
        isOceanCyan,
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
