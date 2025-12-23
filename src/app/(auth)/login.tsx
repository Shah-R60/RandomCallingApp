import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

// OAuth client IDs (must match google-services.json project)
const WEB_CLIENT_ID = '998717722682-ro60kjsam98nm9bk69srbr9io85oav58.apps.googleusercontent.com';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email'],
    });
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services are available');
      console.log('Initiating Google Sign-In...',GoogleSignin);
      console.log('Google Sign-In method:', GoogleSignin.signIn);
      const signInResult = await GoogleSignin.signIn();
      console.log('Google Sign-In result:', signInResult);
      const { accessToken } = await GoogleSignin.getTokens();
      console.log('Google access token obtained:', accessToken);
      if (!accessToken) {
        throw new Error('No Google access token returned');
      }

      const userInfo = {
        email: signInResult.data.user.email,
        name: signInResult.data.user.name,
        picture: signInResult.data.user.photo,
      };

      console.log('Google user info:', userInfo);
      console.log('Google access token:', accessToken);

      const response = await fetch(`${BACKEND_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          googleAccessToken: accessToken,
        }),
      });

      console.log('Backend response status:', response.status);

      const result = await response.json();
      console.log('Backend response data:', result);

      if (result.success) {
        await AsyncStorage.setItem('@access_token', result.data.Accesstoken);
        await AsyncStorage.setItem('@refresh_token', result.data.refreshToken);
        await AsyncStorage.setItem('@user', JSON.stringify(result.data.user));
        router.replace('/(home)');
      } else {
        Alert.alert('Error', result.message || 'Failed to login');
      }
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled; no alert needed
        return;
      }
      if (error?.code === statusCodes.IN_PROGRESS) {
        return;
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
        return;
      }
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="call" size={80} color="#000080" style={styles.logo} />
        <Text style={styles.title}>Cross-Call</Text>
        <Text style={styles.subtitle}>Connect with people anonymously</Text>

        <Pressable
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000080',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 50,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000080',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 280,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    marginTop: 30,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});