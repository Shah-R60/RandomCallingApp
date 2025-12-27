import {
  StreamCall,
  useStreamVideoClient,
  useCalls,
  useCallStateHooks,
  CallingState,
} from '@stream-io/video-react-native-sdk';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import InCallManager from 'react-native-incall-manager';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../providers/AuthProvider';
import Toast from 'react-native-toast-message';
import axiosInstance from '../../../utils/axiosInstance';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

function AudioCallUI() {
  const { useCallCallingState, useParticipants, useCallSession } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const session = useCallSession();
  const [duration, setDuration] = useState(0);
  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const hasSeenOtherParticipantRef = useRef(false);
  const { accessToken, refreshUserData } = useAuth();
  const callStartTimeRef = useRef<number | null>(null);

  const call = useCalls()[0];
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Start InCallManager when call is active (for proximity sensor)
  useEffect(() => {
    // Start InCallManager with speaker on by default
    InCallManager.start({ media: 'audio' });
    InCallManager.setForceSpeakerphoneOn(true);
    console.log('📱 [INCALL] InCallManager started with speaker on');

    return () => {
      // Stop InCallManager when leaving call screen
      InCallManager.stop();
      console.log('📱 [INCALL] InCallManager stopped');
    };
  }, []);

  // Set initial audio mode for call with Bluetooth support
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
          // These settings enable Bluetooth audio routing
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
        });
        console.log('🎧 [AUDIO] Audio mode configured with Bluetooth support');
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    };
    setupAudio();

    // Cleanup audio mode when component unmounts
    return () => {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
      }).catch(() => {});
    };
  }, []);

  // Monitor duration
  useEffect(() => {
    if (callingState === CallingState.JOINED && session) {
      // Record call start time
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }

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
      
      // Remove from matchmaking queue
      if (accessToken) {
        await axiosInstance.post('/api/matchmaking/leave').catch(() => {});
      }
      
      console.log('✅ [END CALL] Cleanup complete');
    } catch (error) {
      console.error('❌ [END CALL ERROR]:', error);
    } finally {
      // Refresh user data to get updated coin balance
      console.log('🔄 [REFRESH] Refreshing user data...');
      await refreshUserData();
      
      // Check if call was ended early (< 60 seconds) and show warning
      if (callStartTimeRef.current) {
        const callDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        console.log(`⏱️ [CALL DURATION] ${callDuration} seconds`);
        
        if (callDuration < 60) {
          Toast.show({
            type: 'error',
            text1: '⚠️ Early Exit Penalty',
            text2: '1 coin deducted for ending call before 1 minute',
            position: 'bottom',
            visibilityTime: 5000,
          });
        }
      }
      
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

  const handleToggleSpeaker = async () => {
    try {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      
      // Control speakerphone via InCallManager
      // When speaker is OFF (null/false), InCallManager automatically enables proximity sensor
      // When speaker is ON (true), proximity sensor is disabled
      // This handles screen off when phone is near ear automatically
      InCallManager.setForceSpeakerphoneOn(newSpeakerState ? true : false);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !newSpeakerState,
        // Keep Bluetooth support while toggling speaker
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
      });
      
      console.log(`🔊 [SPEAKER] Speaker ${newSpeakerState ? 'ON (Speaker/Bluetooth)' : 'OFF (Earpiece with proximity sensor)'}`);
    } catch (error) {
      console.error('❌ [SPEAKER ERROR]:', error);
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
          {/* Microphone Button */}
          <Pressable
            style={[styles.controlButton, isMuted && styles.activeControlButton]}
            onPress={handleToggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color="#fff"
            />
          </Pressable>

          {/* End Call Button */}
          <Pressable
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>

          {/* Speaker Button */}
          <Pressable
            style={[styles.controlButton, !isSpeakerOn && styles.activeControlButton]}
            onPress={handleToggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={28}
              color="#fff"
            />
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
  const retryRef = useRef(false);

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

        // Retry once on initial WebSocket failure
        const isWsFailure = (error as any)?.isWSFailure || (error as any)?.message?.includes('WS connection');
        if (!retryRef.current && isWsFailure) {
          retryRef.current = true;
          console.log('🔁 [RETRY] Reattempting call join after WS failure...');
          setTimeout(setupCall, 1200);
          return;
        }

        Toast.show({
          type: 'error',
          text1: 'Connection issue',
          text2: 'Could not join the call. Please try again.',
          position: 'bottom',
          visibilityTime: 4000,
        });
        requestAnimationFrame(() => router.replace('/(home)'));
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
    backgroundColor: '#1e1c64ff',
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
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#2d2d44',
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
    gap: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4a5568',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeControlButton: {
    backgroundColor: '#667eea',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
    width: 72,
    height: 72,
    borderRadius: 36,
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
