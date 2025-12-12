import React from "react";
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';

export default function AuthLayout() {
    const { user } = useAuth();

    if(user){
        return <Redirect href="/(home)" />;
    }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
