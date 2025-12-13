import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    console.log('🚪 [LOGOUT] User logging out...');
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginBottom: 30,
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      marginBottom: 16,
    },
    settingsButtonText: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    logoutButtonText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Theme Mode Toggle */}
        <View style={styles.settingsButton}>
          <Ionicons 
            name={themeMode === 'dark' ? 'moon' : 'sunny'} 
            size={24} 
            color={theme.colors.primary} 
          />
          <Text style={styles.settingsButtonText}>
            {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </Text>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
          />
        </View>

        {/* Type Selector */}
        <Pressable 
          style={styles.settingsButton} 
          onPress={() => router.push('/(home)/ideology-selector')}
        >
          <Ionicons name="color-palette-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.settingsButtonText}>Type Selector</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Pressable>

        {/* Logout Button */}
        <Pressable 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
