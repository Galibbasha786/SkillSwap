// frontend-web/src/contexts/ThemeContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const COLOR_THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Blue and purple',
    colors: ['#3b82f6', '#a855f7', '#eef2ff']
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green accents',
    colors: ['#10b981', '#14b8a6', '#ecfdf5']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm coral tones',
    colors: ['#f97316', '#ec4899', '#fff7ed']
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft pink highlights',
    colors: ['#e11d48', '#f43f5e', '#fff1f2']
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Calm professional colors',
    colors: ['#475569', '#0f766e', '#f1f5f9']
  }
];

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [colorTheme, setColorTheme] = useState('classic');

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedColorTheme = localStorage.getItem('colorTheme');

    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }

    if (COLOR_THEMES.some((themeOption) => themeOption.id === savedColorTheme)) {
      setColorTheme(savedColorTheme);
    }
  }, []);

  // Update theme in DOM and localStorage
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Update color theme in DOM and localStorage
  useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme;
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const value = {
    isDark,
    toggleTheme,
    theme: isDark ? 'dark' : 'light',
    colorTheme,
    setColorTheme,
    colorThemes: COLOR_THEMES
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
