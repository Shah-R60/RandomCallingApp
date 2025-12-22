import {
  StreamCall,
  useStreamVideoClient,
  useCalls,
  useCallStateHooks,
  CallingState,
} from '@stream-io/video-react-native-sdk';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

function AudioCallUI() {
  const { useCallCallingState, useParticipants, useCallSession } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const session = useCallSession();
  const [duration, setDuration] = useState(0);
  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const hasSeenOtherParticipantRef = useRef(false);

  const call = useCalls()[0];

  // Monitor duration
  useEffect(() => {
    if (callingState === CallingState.JOINED && session) {
      const interval = setInterval(() => {
        const startTime = session.started_at ? new Date(session.started_at).getTime() : Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callingState, session]);

  // Monitor if other participant leaves
  useEffect(() => {
    if (callingState !== CallingState.JOINED) {
      return;
    }

    const otherParticipant = participants.find(p => p.userId !== call?.currentUserId);
    
    // Track if we've seen the other participant
    if (otherParticipant) {
      hasSeenOtherParticipantRef.current = true;
      console.log('👥 [PARTICIPANT] Other participant is present:', otherParticipant.userId);
    }
    
    // Only show alert if we previously saw them and now they're gone
    if (!otherParticipant && hasSeenOtherParticipantRef.current && participants.length === 1) {
      console.log('👋 [PARTICIPANT LEFT] Other participant disconnected');
      hasSeenOtherParticipantRef.current = false; // Prevent multiple alerts
      
      // Show disconnect message and auto-navigate after 2 seconds
      setTimeout(() => {
        setShowDisconnectMessage(true);
        
        // Auto-navigate to home after showing message
        setTimeout(async () => {
          await call?.leave();
          router.push('/(home)');
        }, 2000);
      }, 100);
    }
  }, [participants, callingState]);

  // Monitor call state changes (if call ends/leaves from their side)
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      console.log('📞 [CALL LEFT] Call ended by other party');
      setTimeout(() => {
        handleEndCall();
      }, 1000);
    }
  }, [callingState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    // Prevent multiple rapid end-call flows
    if (handleEndCall.isEnding) return;
    handleEndCall.isEnding = true;
    try {
      console.log('📞 [END CALL] Ending call and cleaning up...');
      
      // End the call for everyone (not just leave)
      await call?.endCall();
      
      // Remove from queue
      await supabase.functions.invoke('random-match', {
        body: { action: 'leave_queue' }
      });
      
      console.log('✅ [END CALL] Cleanup complete');
    } catch (error) {
      console.error('❌ [END CALL ERROR]:', error);
    } finally {
      requestAnimationFrame(() => router.push('/(home)'));
      handleEndCall.isEnding = false;
    }
  };
  // attach flag property
  handleEndCall.isEnding = handleEndCall.isEnding || false;

  const handleToggleMute = async () => {
    try {
      // Skip toggling if call is already ended to avoid ICE errors
      if (call?.state.callingState === CallingState.LEFT) {
        return;
      }
      console.log('🎤 [MUTE] Toggling microphone...');
      await call?.microphone.toggle();
      console.log('✅ [MUTE] Microphone toggled successfully');
    } catch (error) {
      console.error('❌ [MUTE ERROR]:', error);
      // Ignore errors - likely due to call state changes
    }
  };

  const otherParticipant = participants.find(p => p.userId !== call?.currentUserId);
  const isMuted = call?.microphone.state.status === 'disabled';

  return (
    <View style={styles.container}>
      {/* Disconnect Message Overlay */}
      {showDisconnectMessage && (
        <View style={styles.disconnectOverlay}>
          <View style={styles.disconnectCard}>
            <Ionicons name="call-outline" size={48} color="#ef4444" />
            <Text style={styles.disconnectTitle}>Call Ended</Text>
            <Text style={styles.disconnectMessage}>The other person has left the call</Text>
            <View style={styles.disconnectProgress}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.disconnectSubtext}>Returning to home...</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.content}>
        {/* Status */}
        <View style={styles.statusContainer}>
          {callingState === CallingState.RINGING && (
            <Text style={styles.statusText}>Calling...</Text>
          )}
          {callingState === CallingState.JOINING && (
            <Text style={styles.statusText}>Connecting...</Text>
          )}
          {callingState === CallingState.JOINED && (
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          )}
        </View>

        {/* Participant Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={80} color="#fff" />
          </View>
          <Text style={styles.participantName}>
            {otherParticipant?.name || 'Stranger'}
          </Text>
          {callingState === CallingState.JOINED && (
            <View style={styles.audioIndicator}>
              <Ionicons name="mic" size={20} color="#4ade80" />
              <Text style={styles.audioText}>Audio Connected</Text>
            </View>
          )}
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.controlButton, isMuted && styles.mutedButton]}
            onPress={handleToggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color="#fff"
            />
          </Pressable>

          <Pressable
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CallScreen() {
  const calls = useCalls();
  const call = calls[0];
  const hasJoinedRef = useRef(false);
  const navigatedRef = useRef(false);
  const callIdRef = useRef<string | null>(null);

  // Suppress known harmless WebRTC teardown warnings
  useEffect(() => {
    LogBox.ignoreLogs([
      'AddIceCandidate failed because the session was shut down',
      'PeerConnection not found',
    ]);
  }, []);

  useEffect(() => {
    if (!call || hasJoinedRef.current) {
      return;
    }

    // Prevent rejoining same call if we already joined it
    if (callIdRef.current === call.id) {
      console.log('⏭️ [SKIP] Already joined this call:', call.id);
      return;
    }

    // Configure call for audio-only when joining
    const setupCall = async () => {
      try {
        console.log('🎧 [CALL SCREEN] Joining call...');
        console.log('🎧 [CALL STATE]:', call.state.callingState);
        console.log('🎧 [CALL ID]:', call.id);
        
        hasJoinedRef.current = true;
        callIdRef.current = call.id;
        
        await call.join({
          create: false,
        });
        
        console.log('✅ [CALL JOINED] Successfully joined');
        
        // Disable camera explicitly
        await call.camera.disable();
        console.log('📹 [CAMERA] Camera disabled');
      } catch (error) {
        console.error('❌ [ERROR] Error setting up audio call:', error);
        hasJoinedRef.current = false;
        callIdRef.current = null;
      }
    };

    if (call.state.callingState === CallingState.RINGING || 
        call.state.callingState === CallingState.IDLE) {
      setupCall();
    }
  }, [call?.id]);

  // Navigate away when call is gone, but avoid doing it during render
  useEffect(() => {
    if (!call && !navigatedRef.current) {
      navigatedRef.current = true;
      requestAnimationFrame(() => router.replace('/(home)'));
    }
  }, [call]);

  if (!call) {
    return null;
  }

  return (
    <StreamCall call={call}>
      <AudioCallUI />
    </StreamCall>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  participantName: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  audioText: {
    color: '#4ade80',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  mutedButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  disconnectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  disconnectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disconnectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  disconnectMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  disconnectProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disconnectSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
