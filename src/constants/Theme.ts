// Central theme configuration for the app

// Ideology-based color schemes for LIGHT mode
export const ideologyColors = {
  neutral: {
    primary: '#1e1b4b', // Navy Blue
    primaryLight: '#1e1b4b',
    primaryDark: '#000060',
  },
  rightWing: {
    primary: '#ec5e17ff', // Saffron
    primaryLight: '#ec5e17ff',
    primaryDark: '#ec5e17ff',
  },
  leftWing: {
    primary: '#016109ff', // Green
    primaryLight: '#016109ff',
    primaryDark: '#016109ff',
  },
};

// Ideology-based color schemes for DARK mode
export const ideologyColorsDark = {
  neutral: {
    primary: '#1e1b4b', // Navy Blue
    primaryLight: '#1e1b4b',
    primaryDark: '#1e1b4b',
  },
  rightWing: {
    primary: '#ec5e17ff', // Saffron
    primaryLight: '#ec5e17ff',
    primaryDark: '#ec5e17ff',
  },
  leftWing: {
    primary: '#22C55E', // Brighter Green
    primaryLight: '#4ADE80',
    primaryDark: '#16A34A',
  },
};

// Light theme colors
export const lightThemeColors = {
  background: '#f8f9fa',
  backgroundLight: '#ffffff',
  backgroundDark: '#e6e9f0',
  
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  white: '#ffffff',
  black: '#000000',
  border: '#d1d5db',
  shadow: '#000000',
  
  sliderBackground: '#f3f4f6',
  sliderBorder: '#d1d5db',
};

// Dark theme colors
export const darkThemeColors = {
  background: '#0f172a',      // Main dark background
  backgroundLight: '#1e293b', // Card background
  backgroundDark: '#020617',  // Darker sections
  
  textPrimary: '#f1f5f9',     // Bright white text
  textSecondary: '#cbd5e1',   // Medium gray text (improved visibility)
  textLight: '#94a3b8',       // Light gray text
  
  success: '#22c55e',
  error: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
  
  white: '#ffffff',           // Pure white for icons/important text
  black: '#000000',
  border: '#334155',          // Subtle borders
  shadow: '#000000',
  
  sliderBackground: '#334155',
  sliderBorder: '#475569',
};

export const theme = {
  colors: {
    // Primary colors (default to neutral)
    primary: '#000080', // Navy Blue
    primaryLight: '#1e1b4b',
    primaryDark: '#000060',
    
    // Background colors
    background: '#f8f9fa',
    backgroundLight: '#ffffff',
    backgroundDark: '#e6e9f0',
    
    // Text colors
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    textLight: '#9ca3af',
    
    // Accent colors
    accent: '#000080',
    accentLight: 'rgba(0, 0, 128, 0.3)',
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // UI colors
    white: '#ffffff',
    border: '#d1d5db',
    shadow: '#000000',
    
    // Slider colors
    sliderBackground: '#f3f4f6',
    sliderBorder: '#d1d5db',
    sliderFill: '#000080',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    header: 22,
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 30,
    xxl: 40,
  },
  
  // Border radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 30,
    round: 9999,
  },
};

export default theme;
