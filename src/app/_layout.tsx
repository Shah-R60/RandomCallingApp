import {Stack, Slot } from 'expo-router';
import { GestureHandlerRootView} from 'react-native-gesture-handler'
import React from "react";
import AuthProvider from '../providers/AuthProvider';
import { ThemeProvider } from '../providers/ThemeProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView>
      <ThemeProvider>
        <AuthProvider>  
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(home)" options={{ headerShown: false }} />
         </Stack>
       </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
