import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  theme as baseTheme, 
  ideologyColors, 
  ideologyColorsDark,
  lightThemeColors,
  darkThemeColors 
} from '../constants/Theme';

export type IdeologyType = 'neutral' | 'leftWing' | 'rightWing';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: typeof baseTheme;
  ideology: IdeologyType;
  themeMode: ThemeMode;
  setIdeology: (ideology: IdeologyType) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const IDEOLOGY_STORAGE_KEY = '@user_ideology';
const THEME_MODE_STORAGE_KEY = '@user_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ideology, setIdeologyState] = useState<IdeologyType>('neutral');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [currentTheme, setCurrentTheme] = useState(baseTheme);

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Update theme colors when ideology or theme mode changes
  useEffect(() => {
    const ideologyColorSet = themeMode === 'dark' ? ideologyColorsDark : ideologyColors;
    const themeColorSet = themeMode === 'dark' ? darkThemeColors : lightThemeColors;
    const colors = ideologyColorSet[ideology];
    
    setCurrentTheme({
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        // Ideology-specific colors
        primary: colors.primary,
        primaryLight: colors.primaryLight,
        primaryDark: colors.primaryDark,
        accent: colors.primary,
        sliderFill: colors.primary,
        
        // Theme mode colors
        background: themeColorSet.background,
        backgroundLight: themeColorSet.backgroundLight,
        backgroundDark: themeColorSet.backgroundDark,
        textPrimary: themeColorSet.textPrimary,
        textSecondary: themeColorSet.textSecondary,
        textLight: themeColorSet.textLight,
        success: themeColorSet.success,
        error: themeColorSet.error,
        warning: themeColorSet.warning,
        info: themeColorSet.info,
        white: themeColorSet.white,
        border: themeColorSet.border,
        shadow: themeColorSet.shadow,
        sliderBackground: themeColorSet.sliderBackground,
        sliderBorder: themeColorSet.sliderBorder,
      },
    });
  }, [ideology, themeMode]);

  const loadPreferences = async () => {
    try {
      const [savedIdeology, savedThemeMode] = await Promise.all([
        AsyncStorage.getItem(IDEOLOGY_STORAGE_KEY),
        AsyncStorage.getItem(THEME_MODE_STORAGE_KEY),
      ]);
      
      if (savedIdeology && ['neutral', 'leftWing', 'rightWing'].includes(savedIdeology)) {
        setIdeologyState(savedIdeology as IdeologyType);
        console.log('📖 [THEME] Loaded ideology:', savedIdeology);
      }
      
      if (savedThemeMode && ['light', 'dark'].includes(savedThemeMode)) {
        setThemeModeState(savedThemeMode as ThemeMode);
        console.log('📖 [THEME] Loaded theme mode:', savedThemeMode);
      }
    } catch (error) {
      console.error('❌ [THEME] Error loading preferences:', error);
    }
  };

  const setIdeology = async (newIdeology: IdeologyType) => {
    try {
      await AsyncStorage.setItem(IDEOLOGY_STORAGE_KEY, newIdeology);
      setIdeologyState(newIdeology);
      console.log('💾 [THEME] Saved ideology:', newIdeology);
    } catch (error) {
      console.error('❌ [THEME] Error saving ideology:', error);
    }
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
      setThemeModeState(newMode);
      console.log('💾 [THEME] Saved theme mode:', newMode);
    } catch (error) {
      console.error('❌ [THEME] Error saving theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, ideology, themeMode, setIdeology, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
