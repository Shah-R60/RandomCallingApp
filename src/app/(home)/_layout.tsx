import { Redirect, Stack } from 'expo-router';
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
              headerStyle: { backgroundColor: '#667eea' },
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