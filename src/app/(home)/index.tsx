import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect } from "react";
import { Ionicons } from '@expo/vector-icons';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function HomeScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string>('');
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();

  useEffect(() => {
    // Clean up any leftover queue entries and calls when app loads
    cleanupOnMount();
  }, []);

  const cleanupOnMount = async () => {
    try {
      console.log('🧹 [CLEANUP] Cleaning up on mount...');
      
      // Only cleanup old calls that are not actively joined
      if (videoClient) {
        const calls = videoClient.state.calls;
        for (const call of calls) {
          const state = call.state.callingState;
          // Only cleanup idle/left calls, not active ones
          if (state === 'idle' || state === 'left') {
            console.log('🚪 [CLEANUP] Leaving idle call:', call.id);
            await call.leave().catch(err => console.log('Call leave error (expected):', err));
          } else {
            console.log('⏭️ [CLEANUP] Skipping active call:', call.id, 'state:', state);
          }
        }
      }
      
      // Remove from queue if present (safe to always try)
      await supabase.functions.invoke('random-match', {
        body: { action: 'leave_queue' }
      }).catch(err => console.log('Queue leave error (expected):', err));
      
      console.log('✅ [CLEANUP] Cleanup complete');
    } catch (error) {
      console.error('❌ [CLEANUP ERROR]:', error);
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
    console.log('🔄 [STATUS] Joining queue...');

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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Ionicons name="mic" size={80} color="#667eea" />
        <Text style={styles.title}>Random Audio Chat</Text>
        <Text style={styles.subtitle}>Connect with strangers through voice</Text>
      </View>

      <View style={styles.mainContent}>
        {isSearching ? (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.statusText}>{status}</Text>
            <Pressable style={styles.cancelButton} onPress={handleCancelSearch}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.findButton} onPress={handleFindRandomUser}>
            <Ionicons name="call" size={40} color="#fff" />
            <Text style={styles.findButtonText}>Find Someone to Talk</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap the button to connect with a random person</Text>
        <Pressable 
          style={styles.logoutButton} 
          onPress={async () => {
            console.log('🚪 [LOGOUT] User logging out...');
            await supabase.auth.signOut();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  findButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  searchingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  statusText: {
    fontSize: 20,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 16,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#ef4444',
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});