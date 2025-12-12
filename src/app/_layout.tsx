import {Stack, Slot } from 'expo-router';
import { GestureHandlerRootView} from 'react-native-gesture-handler'
import React from "react";
import AuthProvider from '../providers/AuthProvider';
export default function RootLayout() {
  return (
    <GestureHandlerRootView>
        <AuthProvider>  
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(home)" options={{ headerShown: false }} />
         </Stack>
       </AuthProvider>
    </GestureHandlerRootView>
  );
}
