import { createContext, useContext, useEffect, useState, ReactNode, forwardRef } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });

export const ThemeProvider = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function ThemeProvider({ children }, _ref) {
    const [theme, setTheme] = useState<Theme>(() => {
      const stored = localStorage.getItem('cakmak-theme');
      return (stored === 'light' || stored === 'dark') ? stored : 'dark';
    });

    useEffect(() => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('cakmak-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }
);

export const useTheme = () => useContext(ThemeContext);
