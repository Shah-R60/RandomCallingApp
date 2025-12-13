import { Redirect, Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import VideoProvider from '../../providers/VideoProvider';
import CallProvider from '../../providers/CallProvider';
import { useTheme } from '../../providers/ThemeProvider';

export default function HomeLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <VideoProvider>
      <CallProvider>
        <Stack>
          <Stack.Screen 
            name="index" 
            options={{ 
              headerShown: true,
              title: 'Cross-Call',
              headerStyle: { backgroundColor: theme.colors.primary },
              headerTintColor: theme.colors.white,
              headerTitleStyle: { fontWeight: 'bold', fontSize: 25 },
              headerTitleAlign: 'center',
              headerRight: () => (
                <Pressable 
                  onPress={() => router.push('/(home)/settings')}
                  style={{ marginRight: 15 }}
                >
                  <Ionicons name="settings-outline" size={24} color={theme.colors.white} />
                </Pressable>
              ),
            }} 
          />
          <Stack.Screen 
            name="settings" 
            options={{ 
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: theme.colors.primary },
              headerTintColor: theme.colors.white,
              headerTitleStyle: { fontWeight: 'bold' }
            }} 
          />
          <Stack.Screen 
            name="ideology-selector" 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="call/index" 
            options={{ 
              headerShown: false, 
              title: 'Call',
              presentation: 'fullScreenModal'
            }} 
          />
        </Stack>
      </CallProvider>
    </VideoProvider>
  );
}