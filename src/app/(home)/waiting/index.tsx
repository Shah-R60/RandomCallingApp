import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';

import WaitingAnimation from '../../../components/WaitingAnimation';
import axiosInstance from '../../../utils/axiosInstance';
import { useAuth } from '../../../providers/AuthProvider';
import { useTheme } from '../../../providers/ThemeProvider';
import { useBackgroundMusic } from '../../../hooks/useBackgroundMusic';

export default function WaitingScreen() {
  const [status, setStatus] = useState<string>('Joining queue...');
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  const startedRef = useRef(false);

  const videoClient = useStreamVideoClient();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { ensureLatestMusic, playWaitingMusic, stopMusic } = useBackgroundMusic();

  const clearPolling = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      clearInterval(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const leaveQueue = async () => {
    try {
      await axiosInstance.post('/api/matchmaking/leave');
    } catch {
      // ignore
    }
  };

  const cleanup = async () => {
    isStoppingRef.current = true;
    clearPolling();
    await stopMusic();
    await leaveQueue();
  };

  const joinCall = async (callId: string, otherUserId: string) => {
    try {
      if (!videoClient) {
        throw new Error('Video client not initialized');
      }

      if (!user?._id) {
        throw new Error('User not available');
      }

      setStatus('Connecting...');

      const call = videoClient.call('default', callId);
      await call.getOrCreate({
        ring: false,
        data: {
          members: [{ user_id: user._id }, { user_id: otherUserId }],
          settings_override: {
            audio: {
              mic_default_on: true,
              default_device: 'speaker',
            },
            video: {
              camera_default_on: false,
              enabled: false,
              target_resolution: {
                width: 240,
                height: 240,
              },
            },
          },
        },
      });

      await stopMusic();
      router.replace('/call');
    } catch (error) {
      console.error('❌ [WAITING] Failed to connect to call:', error);
      await stopMusic();

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to connect to call',
        position: 'bottom',
        visibilityTime: 3000,
        props: {
          style: { borderRadius: 20 },
        },
      });

      router.replace('/(home)');
    }
  };

  const startPolling = (initialDelay: number = 3000) => {
    clearPolling();

    let currentDelay = initialDelay;
    const maxDelay = 10000;
    let pollCount = 0;
    const maxPolls = 15; // ~1 minute

    const poll = async () => {
      if (isStoppingRef.current) return;

      try {
        pollCount += 1;
        const response = await axiosInstance.get('/api/matchmaking/status');
        const result = response.data;

        if (result?.data?.status === 'matched') {
          clearPolling();
          setStatus('Match found!');
          await stopMusic();
          await joinCall(result.data.queueEntry.call_id, result.data.queueEntry.matched_with);
          return;
        }

        if (result?.data?.status === 'not_in_queue') {
          clearPolling();
          await stopMusic();
          router.replace('/(home)');
          return;
        }

        if (pollCount >= maxPolls) {
          clearPolling();
          await leaveQueue();
          await stopMusic();

          Toast.show({
            type: 'info',
            text2: 'Could not find a match. Please try again later.',
            position: 'bottom',
            visibilityTime: 4000,
            props: {
              style: { borderRadius: 20 },
            },
          });

          router.replace('/(home)');
          return;
        }

        setStatus('Searching for someone...');
        currentDelay = Math.min(currentDelay * 1.2, maxDelay);
        pollingTimeoutRef.current = setTimeout(poll, currentDelay) as any;
      } catch (error) {
        console.error('❌ [WAITING] Polling error:', error);
        clearPolling();
        await stopMusic();
        router.replace('/(home)');
      }
    };

    pollingTimeoutRef.current = setTimeout(poll, currentDelay) as any;
  };

  const startSearch = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!videoClient) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Video client not initialized',
        position: 'bottom',
        visibilityTime: 3000,
        props: {
          style: { borderRadius: 20 },
        },
      });
      router.replace('/(home)');
      return;
    }

    try {
      setStatus('Joining queue...');

      const response = await axiosInstance.post('/api/matchmaking/join');
      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to join queue');
      }

      // Only start music after successful queue join
      ensureLatestMusic();
      await playWaitingMusic();

      if (result.data.status === 'matched') {
        setStatus('Match found!');
        await stopMusic();
        await joinCall(result.data.callId, result.data.matchedWith);
        return;
      }

      if (result.data.status === 'waiting') {
        setStatus('Searching for someone...');
        startPolling(3000);
        return;
      }

      throw new Error('Unexpected queue status');
    } catch (error: any) {
      console.error('❌ [WAITING] Error joining queue:', error);
      await stopMusic();

      // Check if it's a ban error (403)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to join queue. Please try again.';
      const isBanError = error?.response?.status === 403;

      Toast.show({
        type: 'error',
        text1: isBanError ? '🚫 Temporarily Banned' : 'Error',
        text2: errorMessage,
        position: 'bottom',
        visibilityTime: isBanError ? 6000 : 3000,
        props: {
          style: { borderRadius: 20 },
        },
      });

      router.replace('/(home)');
    }
  };

  const handleCancel = async () => {
    setStatus('Cancelling...');
    await cleanup();
    router.replace('/(home)');
  };

  useEffect(() => {
    startSearch();

    return () => {
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: theme.spacing.lg,
      // paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.xxl,
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    topCard: {
      backgroundColor: theme.colors.backgroundDark,
      // borderRadius: theme.borderRadius.xxl,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    middleCard: {
      backgroundColor: theme.colors.backgroundDark,
      // borderRadius: theme.borderRadius.xxl,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    bottomCard: {
      backgroundColor: theme.colors.backgroundDark,
      // borderRadius: theme.borderRadius.xxl,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    statusText: {
      fontSize: theme.fontSize.xl,
      color: theme.colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
    rulesTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.lg,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    rulesText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.md,
      textAlign: 'center',
      lineHeight: 20,
    },
    cancelButton: {
      paddingVertical: theme.spacing.xs + 8,
      paddingHorizontal: theme.spacing.lg + 12,
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.xxl,
      width: '100%',
    },
    cancelButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="auto" />

      {/* Top Card - Animation and Status */}
      <View style={styles.topCard}>
        <WaitingAnimation />
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Middle Card - Rules */}
      <View style={styles.middleCard}>
        <Text style={styles.rulesTitle}>Rules</Text>
        <Text style={styles.rulesText}>
          Be respectful. No harassment. If you feel unsafe, end the call and report.
        </Text>
      </View>

      {/* Bottom Card - Cancel Button */}
      <View style={styles.bottomCard}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
