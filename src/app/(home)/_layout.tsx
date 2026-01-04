import { Redirect, Stack, router } from 'expo-router';
import { Pressable, View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { useAuth } from '../../providers/AuthProvider';
import VideoProvider from '../../providers/VideoProvider';
import CallProvider from '../../providers/CallProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { TopicProvider } from '../../providers/TopicProvider';
import React, { useEffect, useRef, useState } from 'react';


const CoinAnimation = () => {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFD700',
        borderWidth: 2,
        borderColor: '#FFA500',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFA500' }}>$</Text>
    </View>
  );
};

export default function HomeLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <VideoProvider>
      <CallProvider>
        <TopicProvider>
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
              headerLeft: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 0 }}>
                  <Pressable 
                    onPress={() => router.push('/(home)/profile')}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons name="person-circle-outline" size={32} color={theme.colors.white} />
                  </Pressable>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginLeft: 0
                  }}>
                    <CoinAnimation />
                    <Text style={{ 
                      color: theme.colors.white, 
                      fontSize: 16, 
                      fontWeight: 'bold',
                      marginLeft: 2
                    }}>
                      {user?.stars || 0}
                    </Text>
                  </View>
                </View>
              ),
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
            name="profile" 
            options={{ 
              headerShown: true,
              title: 'Profile',
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
          <Stack.Screen 
            name="waiting/index" 
            options={{ 
              headerShown: true,
              title: 'Cross-Call',
              headerStyle: { backgroundColor: theme.colors.primary },
              headerTintColor: theme.colors.white,
              headerTitleAlign: 'center',
              headerTitleStyle: { fontWeight: 'bold' },
              headerBackVisible: false,
              headerLeft: () => null
            }} 
          />
        </Stack>
        </TopicProvider>
      </CallProvider>
      <Toast 
        config={{
          success: (props) => (
            <BaseToast
              {...props}
              style={{ borderRadius: 20, width: '95%', marginBottom: 10, height: 50 }}
              text1Style={{ textAlign: 'center', fontSize: 13}}
              text2Style={{ textAlign: 'center', fontSize: 13 }}
            />
          ),
          error: (props) => (
            <ErrorToast
              {...props}
              style={{ borderRadius: 20, width: '95%', marginBottom: 10, height: 50 }}
              text1Style={{ textAlign: 'center', fontSize: 13 }}
              text2Style={{ textAlign: 'center', fontSize: 13 }}
            />
          ),
          info: (props) => (
            <InfoToast
              {...props}
              style={{ borderRadius: 20, width: '95%', marginBottom: 10, height: 50 }}
              text1Style={{ textAlign: 'center', fontSize: 13 }}
              text2Style={{ textAlign: 'center', fontSize: 13 }}
            />
          ),
        }}
      />
    </VideoProvider>
  );
}