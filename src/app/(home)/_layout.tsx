import { Redirect, Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import VideoProvider from '../../providers/VideoProvider';
import CallProvider from '../../providers/CallProvider';

export default function HomeLayout() {
  const { user } = useAuth();

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
              title: 'Random Audio Chat',
              headerStyle: { backgroundColor: '#000080' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              headerRight: () => (
                <Pressable 
                  onPress={() => router.push('/(home)/settings')}
                  style={{ marginRight: 15 }}
                >
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </Pressable>
              ),
            }} 
          />
          <Stack.Screen 
            name="settings" 
            options={{ 
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: '#000080' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
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