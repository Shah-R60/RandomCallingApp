import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from "react";
import WaitingAnimation from '../../components/WaitingAnimation';
import { Ionicons } from '@expo/vector-icons';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import TopicCard, { TopicReference } from '../../components/TopicCard';
import TopicCardSkeleton from '../../components/TopicCardSkeleton';
import SwipeButton from 'rn-swipe-button';
import { useTheme } from '../../providers/ThemeProvider';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

interface Topic {
  _id: string;
  title: string;
  image: string;
  description: Array<{
    type: 'text' | 'image' | 'video';
    content: string;
    order: number;
    _id: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function HomeScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicLoading, setTopicLoading] = useState(true);
  const swipeButtonRef = useRef<any>(null);
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    // Only cleanup on initial mount, not every time we come back from call
    const cleanup = async () => {
      // Just remove from queue, don't touch active calls
      await supabase.functions.invoke('random-match', {
        body: { action: 'leave_queue' }
      }).catch(() => {});
    };
    cleanup();
    // Fetch today's topic
    fetchNewestTopic();
  }, []);

  const fetchNewestTopic = async () => {
    try {
      setTopicLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/topic/getNewestTopic`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setTopic(result.data);
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setTopicLoading(false);
    }
  };



  const checkQueueStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('random-match', {
        body: { action: 'check_status' }
      });

      if (data?.status === 'waiting') {
        setIsSearching(true);
        setStatus('Searching for someone...');
        startPolling();
      } else if (data?.status === 'matched') {
        // Join the call
        await joinCall(data.queueEntry.call_id, data.queueEntry.matched_with);
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('random-match', {
          body: { action: 'check_status' }
        });

        if (data?.status === 'matched') {
          clearInterval(interval);
          setIsSearching(false);
          await joinCall(data.queueEntry.call_id, data.queueEntry.matched_with);
        }
      } catch (error) {
        console.error('Error polling queue:', error);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    // Store interval ID to clear it later
    return interval;
  };

  const handleFindRandomUser = async () => {
    console.log('🔘 [BUTTON CLICK] Find Someone to Talk button pressed');
    console.log('📱 [USER INFO] User ID:', user?.id);
    
    if (!videoClient) {
      console.error('❌ [ERROR] Video client not initialized');
      Alert.alert('Error', 'Video client not initialized');
      return;
    }

    console.log('✅ [VIDEO CLIENT] Video client is ready');
    setIsSearching(true);
    setStatus('Joining queue...');
    console.log('� [STATUS] Joining queue...');

    try {
      console.log('📡 [API CALL] Calling random-match function with action: join_queue');
      const { data, error } = await supabase.functions.invoke('random-match', {
        body: { action: 'join_queue' }
      });

      console.log('📥 [API RESPONSE] Data:', JSON.stringify(data, null, 2));
      console.log('📥 [API RESPONSE] Error:', error);

      if (error) {
        console.error('❌ [ERROR] Supabase function error:', error);
        throw error;
      }

      if (data.status === 'matched') {
        console.log('🎉 [MATCH FOUND] Immediately matched!');
        console.log('👤 [MATCH INFO] Matched with:', data.matchedWith);
        console.log('📞 [CALL INFO] Call ID:', data.callId);
        setStatus('Match found!');
        await joinCall(data.callId, data.matchedWith);
      } else if (data.status === 'waiting') {
        console.log('⏳ [WAITING] Added to queue, starting to poll...');
        setStatus('Searching for someone...');
        startPolling();
      }
    } catch (error) {
      console.error('❌ [ERROR] Error joining queue:', error);
      console.error('❌ [ERROR DETAILS]:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'Failed to join queue. Please try again.');
      setIsSearching(false);
      setStatus('');
    }
  };

  const joinCall = async (callId: string, otherUserId: string) => {
    try {
      console.log('📞 [JOIN CALL] Starting call setup...');
      console.log('📞 [CALL ID]:', callId);
      console.log('👤 [OTHER USER]:', otherUserId);
      setStatus('Connecting...');
      
      // Create call with audio-only settings
      const call = videoClient?.call('default', callId);
      console.log('✅ [CALL OBJECT] Call object created:', call ? 'Success' : 'Failed');
      
      console.log('🔧 [CALL SETUP] Creating call with settings...');
      await call?.getOrCreate({
        ring: false,
        data: {
          members: [
            { user_id: user.id },
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
      console.log('🚀 [NAVIGATION] Navigating to call screen...');
      // Navigate to call screen
      router.push('/call');
    } catch (error) {
      console.error('❌ [ERROR] Error joining call:', error);
      console.error('❌ [ERROR DETAILS]:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'Failed to connect to call');
      setIsSearching(false);
      setStatus('');
    }
  };

  const handleCancelSearch = async () => {
    console.log('🛑 [CANCEL] User cancelled search');
    try {
      console.log('📡 [API CALL] Leaving queue...');
      await supabase.functions.invoke('random-match', {
        body: { action: 'leave_queue' }
      });
      console.log('✅ [SUCCESS] Left queue successfully');
      setIsSearching(false);
      setStatus('');
    } catch (error) {
      console.error('❌ [ERROR] Error leaving queue:', error);
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