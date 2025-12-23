import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from "react";
import WaitingAnimation from '../../components/WaitingAnimation';
import { Ionicons } from '@expo/vector-icons';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
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
  const { user, accessToken } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    // Fetch today's topic
    fetchNewestTopic();
  }, []);

  const fetchNewestTopic = async () => {
    try {
      setTopicLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/topic/getNewestTopic`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
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



  const handleFindRandomUser = async () => {
    console.log('🔘 [BUTTON CLICK] Find Someone to Talk button pressed');
    
    if (!videoClient) {
      console.error('❌ [ERROR] Video client not initialized');
      Alert.alert('Error', 'Video client not initialized');
      return;
    }

    setIsSearching(true);
    setStatus('Joining queue...');

    try {
      // Join matchmaking queue
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to join queue');
      }

      if (result.data.status === 'matched') {
        console.log('🎉 [MATCH FOUND] Immediately matched!');
        setStatus('Match found!');
        await joinCall(result.data.callId, result.data.matchedWith);
      } else if (result.data.status === 'waiting') {
        console.log('⏳ [WAITING] Added to queue, starting to poll...');
        setStatus('Searching for someone...');
        startPolling();
      }
    } catch (error) {
      console.error('❌ [ERROR] Error joining queue:', error);
      Alert.alert('Error', 'Failed to join queue. Please try again.');
      setIsSearching(false);
      setStatus('');
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/matchmaking/status`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const result = await response.json();

        if (result.data.status === 'matched') {
          clearInterval(interval);
          setIsSearching(false);
          await joinCall(result.data.queueEntry.call_id, result.data.queueEntry.matched_with);
        }
      } catch (error) {
        console.error('Error polling queue:', error);
        clearInterval(interval);
        setIsSearching(false);
        setStatus('');
      }
    }, 2000);
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
            }
          }
        }
      });

      console.log('✅ [CALL CREATED] Call created successfully');
      router.push('/call');
    } catch (error) {
      console.error('❌ [ERROR] Error joining call:', error);
      Alert.alert('Error', 'Failed to connect to call');
      setIsSearching(false);
      setStatus('');
    }
  };

  const handleCancelSearch = async () => {
    console.log('🛑 [CANCEL] User cancelled search');
    try {
      await fetch(`${BACKEND_URL}/api/matchmaking/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      setIsSearching(false);
      setStatus('');
    } catch (error) {
      console.error('❌ [ERROR] Error leaving queue:', error);
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