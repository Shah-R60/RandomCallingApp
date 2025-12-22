import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: theme.colors.primary,
    },
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 4,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.white,
      marginBottom: 8,
    },
    userEmail: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      marginBottom: 20,
      overflow: 'hidden',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      padding: 16,
      paddingBottom: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuIcon: {
      width: 40,
      alignItems: 'center',
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginLeft: 12,
    },
    signOutButton: {
      backgroundColor: theme.colors.error,
      margin: 20,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color={theme.colors.primary} />
        </View>
        <Text style={styles.userName}>{user?.user_metadata?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="mail-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Email</Text>
            <Text style={[styles.menuText, { flex: 0, color: theme.colors.textSecondary }]}>
              {user?.email}
            </Text>
          </Pressable>
          <Pressable style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuIcon}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Member Since</Text>
            <Text style={[styles.menuText, { flex: 0, color: theme.colors.textSecondary }]}>
              {new Date(user?.created_at || '').toLocaleDateString()}
            </Text>
          </Pressable>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP INFO</Text>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Version</Text>
            <Text style={[styles.menuText, { flex: 0, color: theme.colors.textSecondary }]}>
              1.0.0
            </Text>
          </Pressable>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={24} color={theme.colors.white} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}
