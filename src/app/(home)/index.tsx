import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from "react";
import Toast from 'react-native-toast-message';
import WaitingAnimation from '../../components/WaitingAnimation';
import { Ionicons } from '@expo/vector-icons';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
import { useAuth } from '../../providers/AuthProvider';
import { useTopic } from '../../providers/TopicProvider';
import TopicCard, { TopicReference } from '../../components/TopicCard';
import TopicCardSkeleton from '../../components/TopicCardSkeleton';
import SwipeButton from 'rn-swipe-button';
import { useTheme } from '../../providers/ThemeProvider';
import axiosInstance from '../../utils/axiosInstance';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';

export default function HomeScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string>('');
  const swipeButtonRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoClient = useStreamVideoClient();
  const { user, accessToken } = useAuth();
  const { topic, loading: topicLoading } = useTopic();
  const { theme } = useTheme();
  const { ensureLatestMusic, playWaitingMusic, stopMusic } = useBackgroundMusic();

  // Cleanup polling on unmount
  useEffect(() => {
    ensureLatestMusic();

    return () => {
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      stopMusic();
    };
  }, []);

  const handleFindRandomUser = async () => {
    console.log('🔘 [BUTTON CLICK] Find Someone to Talk button pressed');
    
    if (!videoClient) {
      console.error('❌ [ERROR] Video client not initialized');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Video client not initialized',
        position: 'bottom',
        visibilityTime: 3000,
        props: {
          style: { borderRadius: 20 }
        }
      });
      return;
    }

    setIsSearching(true);
    setStatus('Joining queue...');
    playWaitingMusic();

    try {
      // Join matchmaking queue
      const response = await axiosInstance.post('/api/matchmaking/join');
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Failed to join queue');
      }

      if (result.data.status === 'matched') {
        console.log('🎉 [MATCH FOUND] Immediately matched!');
        setStatus('Match found!');
        stopMusic();
        await joinCall(result.data.callId, result.data.matchedWith);
      } else if (result.data.status === 'waiting') {
        console.log('⏳ [WAITING] Added to queue, starting to check for matches...');
        setStatus('Searching for someone...');
        // Start polling with exponential backoff
        startPolling(3000); // Start with 3 seconds
      }
    } catch (error) {
      console.error('❌ [ERROR] Error joining queue:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to join queue. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
        props: {
          style: { borderRadius: 20 }
        }
      });
      setIsSearching(false);
      setStatus('');
      stopMusic();
    }
  };

  const startPolling = (initialDelay: number = 3000) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let currentDelay = initialDelay;
    const maxDelay = 10000; // Max 10 seconds between checks
    let pollCount = 0;
    const maxPolls = 15; // ~59 seconds total (approximately 1 minute)

    const poll = async () => {
      try {
        pollCount++;
        console.log(`🔄 [POLLING ${pollCount}/${maxPolls}] Checking queue status... (delay: ${currentDelay}ms)`);
        
        const response = await axiosInstance.get('/api/matchmaking/status');
        const result = response.data;
        console.log('📊 [POLLING RESULT] Status:', result.data.status);

        if (result.data.status === 'matched') {
          console.log('🎉 [MATCH FOUND] Match found during polling!');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatus('Match found!');
          stopMusic();
          await joinCall(result.data.queueEntry.call_id, result.data.queueEntry.matched_with);
        } else if (result.data.status === 'not_in_queue') {
          console.log('⚠️ [NOT IN QUEUE] User removed from queue');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          stopMusic();
          setIsSearching(false);
          setStatus('');
        } else if (pollCount >= maxPolls) {
          console.log('⏱️ [TIMEOUT] Maximum polling attempts reached (~1 minute)');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Leave the queue
          try {
            await axiosInstance.post('/api/matchmaking/leave');
          } catch (err) {
            console.error('Error leaving queue:', err);
          }
          
          stopMusic();
          setIsSearching(false);
          setStatus('');
          
          Toast.show({
            type: 'info',
            // text1: 'No Match Found',
            text2: 'Could not find a match. Please try again later.',
            position: 'bottom',
            visibilityTime: 4000,
            props: {
              style: { borderRadius: 20, innerWidth: '100%',outerHeight: '100%', }
            }
          });
        } else {
          // Exponential backoff: increase delay gradually
          currentDelay = Math.min(currentDelay * 1.2, maxDelay);
          // Schedule next poll
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setTimeout(poll, currentDelay) as any;
        }
      } catch (error) {
        console.error('❌ [POLLING ERROR] Error polling queue:', error);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        stopMusic();
        setIsSearching(false);
        setStatus('');
      }
    };

    // Start the first poll
    pollingIntervalRef.current = setTimeout(poll, currentDelay) as any;
  };

  const joinCall = async (callId: string, otherUserId: string) => {
    try {
      console.log('📞 [JOIN CALL] Starting call setup...');
      setStatus('Connecting...');
      
      // Create call with audio-only settings
      const call = videoClient?.call('default', callId);
      
      await call?.getOrCreate({
        ring: false,
        data: {
          members: [
            { user_id: user._id },
            { user_id: otherUserId }
          ],
          settings_override: {
            audio: { 
              mic_default_on: true,
              default_device: 'speaker'
            },
            video: { 
              camera_default_on: false,
              enabled: false,
              target_resolution: {
                width: 240,
                height: 240
              }
            }
          }
        }
      });

      console.log('✅ [CALL CREATED] Call created successfully');
      stopMusic();
      router.push('/call');
    } catch (error) {
      console.error('❌ [ERROR] Error joining call:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to connect to call',
        position: 'bottom',
        visibilityTime: 3000,
        props: {
          style: { borderRadius: 20 }
        }
      });
      stopMusic();
      setIsSearching(false);
      setStatus('');
    }
  };

  const handleCancelSearch = async () => {
    console.log('🛑 [CANCEL] User cancelled search');
    
    // Clear polling interval/timeout
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    try {
      await axiosInstance.post('/api/matchmaking/leave');
      stopMusic();
      setIsSearching(false);
      setStatus('');
    } catch (error) {
      console.error('❌ [ERROR] Error leaving queue:', error);
      stopMusic();
      setIsSearching(false);
      setStatus('');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: theme.spacing.lg,
    },
    topicLoadingContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    callButtonSection: {
      backgroundColor: theme.colors.backgroundDark,
      paddingVertical: theme.spacing.xxl,
      marginBottom: theme.spacing.lg,
    },
    callButtonContainer: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    swipeButtonWrapper: {
      width: '85%',
      maxWidth: 350,
    },
    swipeButtonContainer: {
      borderRadius: theme.borderRadius.xxl,
      borderWidth: 2,
      borderColor: theme.colors.sliderBorder,
      height: 60,
      backgroundColor: theme.colors.sliderBackground,
    },
    searchingContainer: {
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    statusText: {
      fontSize: theme.fontSize.xl,
      color: theme.colors.primary,
      fontWeight: '600',
      marginTop: theme.spacing.md,
    },
    cancelButton: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.xs + 8,
      paddingHorizontal: theme.spacing.lg + 12,
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.xxl,
    },
    cancelButtonText: {
      color: theme.colors.white,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="auto" />

      {/* Today's Topic */}
      {topicLoading ? (
        <TopicCardSkeleton />
      ) : topic ? (
        <TopicCard topic={topic} />
      ) : null}

      {/* Call Button */}
      <View style={styles.callButtonSection}>
        <View style={styles.callButtonContainer}>
          {isSearching ? (
            <View style={styles.searchingContainer}>
              <WaitingAnimation />
              <Text style={styles.statusText}>{status}</Text>
              <Pressable style={styles.cancelButton} onPress={handleCancelSearch}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.swipeButtonWrapper}>
              <SwipeButton
                ref={swipeButtonRef}
                containerStyles={styles.swipeButtonContainer}
                thumbIconBackgroundColor={theme.colors.primary}
                thumbIconBorderColor={theme.colors.primary}
                railBackgroundColor={theme.colors.sliderBorder}
                railBorderColor={theme.colors.sliderBorder}
                railFillBackgroundColor={theme.colors.sliderFill}
                railFillBorderColor={theme.colors.sliderFill}
                title="Slide to Find Someone"
                titleColor={theme.colors.textSecondary}
                titleFontSize={theme.fontSize.md}
                thumbIconComponent={() => (
                  <Ionicons name="call" size={30} color={theme.colors.white} />
                )}
                onSwipeSuccess={handleFindRandomUser}
                shouldResetAfterSuccess={true}
                resetAfterSuccessAnimDelay={1000}
              />
            </View>
          )}
        </View>
      </View>

      {/* Reference Section - Below Call Button */}
      {topic && <TopicReference topic={topic} />}
    </ScrollView>
  );
}