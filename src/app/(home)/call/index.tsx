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
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, LogBox, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../providers/AuthProvider';
import Toast from 'react-native-toast-message';
import axiosInstance from '../../../utils/axiosInstance';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';
const DEFAULT_CALL_DURATION = 1 * 60; // 15 minutes
const EXTENDED_CALL_DURATION = DEFAULT_CALL_DURATION+2*60; // 30 minutes
const EXTEND_TIME_COST = 5; // Cost in stars/coins to extend
const MIN_COINS_REQUIRED = 25; // Minimum coins required to use extend feature

function AudioCallUI() {
  const { useCallCallingState, useParticipants, useCallSession } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const session = useCallSession();
  const [duration, setDuration] = useState(0);
  const [showDisconnectMessage, setShowDisconnectMessage] = useState(false);
  const [showTimeEndedMessage, setShowTimeEndedMessage] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [maxCallDuration, setMaxCallDuration] = useState(DEFAULT_CALL_DURATION);
  const hasSeenOtherParticipantRef = useRef(false);
  const { accessToken, refreshUserData, user } = useAuth();
  const callStartTimeRef = useRef<number | null>(null);
  const maxCallDurationRef = useRef<number>(DEFAULT_CALL_DURATION);
  const hasShownPartnerExtendToastRef = useRef(false);

  const call = useCalls()[0];
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const hasExtendedTime = maxCallDuration >= EXTENDED_CALL_DURATION;

  useEffect(() => {
    maxCallDurationRef.current = maxCallDuration;
  }, [maxCallDuration]);

  // Check initial custom data for extended time (on mount/call change)
  useEffect(() => {
    if (!call) return;

    const customData = call.state.custom;
    if (customData?.extendedDuration) {
      const extendedDuration = Number(customData.extendedDuration);
      if (Number.isFinite(extendedDuration) && extendedDuration > maxCallDurationRef.current) {
        console.log('🔄 [SYNC] Detected extended duration from call data:', extendedDuration);
        setMaxCallDuration(extendedDuration);
      }
    }
  }, [call?.id]); // Only run when call ID changes

  // Listen for time extension from other participant via custom events
  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on('custom', (event: any) => {
      const payload = event?.custom ?? event?.data?.custom ?? event?.payload?.custom;
      const eventType = payload?.type;

      if (eventType !== 'extend_call_duration') return;

      const extendedDuration = Number(payload?.extendedDuration);
      if (!Number.isFinite(extendedDuration)) return;

      if (extendedDuration > maxCallDurationRef.current) {
        setMaxCallDuration(extendedDuration);

        if (!hasShownPartnerExtendToastRef.current) {
          hasShownPartnerExtendToastRef.current = true;
          Toast.show({
            type: 'success',
            text1: '⏰ Time Extended!',
            text2: 'Your partner extended the call to 30 minutes',
            position: 'top',
            visibilityTime: 4000,
          });
        }

        console.log('✅ [SYNC] Time extended by custom event to:', extendedDuration);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call]); // Only depend on call

  // Start InCallManager when call is active (for proximity sensor)
  useEffect(() => {
    // Start InCallManager with speaker OFF (earpiece) by default
    InCallManager.start({ media: 'audio' });
    InCallManager.setForceSpeakerphoneOn(false);
    console.log('📱 [INCALL] InCallManager started with speaker off (earpiece)');

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
          playThroughEarpieceAndroid: true,
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

  // Monitor duration and enforce time limit
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
        
        // Check if call has exceeded max duration
        if (elapsed >= maxCallDuration && !showTimeEndedMessage) {
          console.log(`⏰ [TIME LIMIT] Call exceeded ${maxCallDuration / 60} minutes, ending call...`);
          setShowTimeEndedMessage(true);
          clearInterval(interval);
          
          // End call after showing message
          setTimeout(async () => {
            try {
              await call?.endCall();
            } catch (error) {
              console.error('Error ending call:', error);
            }
            router.push('/(home)');
          }, 3000);
        }
        
        // Show warning toast at 1 minute before limit
        if (elapsed === (maxCallDuration - 60)) {
          Toast.show({
            type: 'info',
            text1: '⏰ 1 Minute Remaining',
            text2: 'Your call will end in 1 minute',
            position: 'top',
            visibilityTime: 5000,
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callingState, session, showTimeEndedMessage, maxCallDuration]);

  // Handle Increase Time button press
  const handleIncreaseTimePress = () => {
    // Check if user has already extended time
    if (hasExtendedTime) {
      Toast.show({
        type: 'info',
        text1: 'Already Extended',
        text2: 'You can only extend the call once',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    // Check if user has minimum coins required
    if (!user || user.stars < MIN_COINS_REQUIRED) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Stars',
        text2: `You need at least ${MIN_COINS_REQUIRED} stars to extend call time`,
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    // Show extend modal
    setShowExtendModal(true);
  };

  // Handle extend time confirmation
  const handleExtendTime = async () => {
    try {
      setShowExtendModal(false);
      
      // Deduct coins via API
      const response = await axiosInstance.post('/api/users/stars/decrease', {
        amount: EXTEND_TIME_COST
      });

      if (response.data.success) {
        // Sync with the other participant using custom events (call members usually can't UpdateCall)
        try {
          const sendCustomEvent = (call as any)?.sendCustomEvent;
          if (typeof sendCustomEvent === 'function') {
            await sendCustomEvent({
              type: 'extend_call_duration',
              extendedDuration: EXTENDED_CALL_DURATION,
              extendedBy: user?._id || 'unknown',
              extendedAt: new Date().toISOString(),
            });
            console.log('🔄 [SYNC] Sent custom event with extended duration');
          } else {
            console.warn('⚠️ [SYNC] sendCustomEvent not available on call object');
          }
        } catch (syncError) {
          console.error('⚠️ [SYNC] Failed to sync with partner, but local extension applied:', syncError);
        }

        // Extend the call duration locally
        setMaxCallDuration(EXTENDED_CALL_DURATION);
        
        // Refresh user data to update coin balance
        await refreshUserData();

        Toast.show({
          type: 'success',
          text1: '⏰ Time Extended!',
          text2: 'Call extended to 30 minutes',
          position: 'top',
          visibilityTime: 3000,
        });
        
        console.log('✅ [EXTEND TIME] Call extended to 30 minutes');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to Extend',
          text2: response.data.message || 'Please try again',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error: any) {
      console.error('❌ [EXTEND TIME ERROR]:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to extend call time',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  // Monitor if other participant leaves
  useEffect(() => {
    if (callingState !== CallingState.JOINED) {
      return;
    }

    const otherParticipant = participants.find(p => p.userId !== call?.currentUserId);
    
    // Track if we've seen the other participant (only log once when first detected)
    if (otherParticipant && !hasSeenOtherParticipantRef.current) {
      hasSeenOtherParticipantRef.current = true;
      console.log('👥 [PARTICIPANT] Other participant joined:', otherParticipant.userId);
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
      {/* Extend Time Modal */}
      <Modal
        visible={showExtendModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExtendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="time-outline" size={32} color="#1e1c64" />
              <Text style={styles.modalTitle}>Extend Call Duration</Text>
            </View>
            <Text style={styles.modalMessage}>
              Extend this call to 30 minutes for both sides.
            </Text>
            <Text style={styles.modalCost}>
              This will use {EXTEND_TIME_COST}⭐. Do you want to continue?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonNo]}
                onPress={() => setShowExtendModal(false)}
              >
                <Text style={styles.modalButtonTextNo}>No</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonYes]}
                onPress={handleExtendTime}
              >
                <Text style={styles.modalButtonTextYes}>Yes, Extend</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Top Action Buttons */}
      <View style={styles.topActions}>
        <Pressable 
          style={[styles.topActionButton, hasExtendedTime && styles.disabledButton]} 
          onPress={handleIncreaseTimePress}
        >
          <Ionicons name="time-outline" size={20} color="#fff" />
          <Text style={styles.topActionText}>
            {hasExtendedTime ? 'Extended' : 'Increase Time'}
          </Text>
        </Pressable>
        
        <Pressable style={[styles.topActionButton, styles.reportButton]} onPress={() => console.log('Report pressed')}>
          <Ionicons name="flag-outline" size={20} color="#fff" />
          <Text style={styles.topActionText}>Report</Text>
        </Pressable>
      </View>

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

      {/* Time Ended Message Overlay */}
      {showTimeEndedMessage && (
        <View style={styles.disconnectOverlay}>
          <View style={styles.disconnectCard}>
            <Ionicons name="time-outline" size={48} color="#f59e0b" />
            <Text style={styles.disconnectTitle}>Time's Up!</Text>
            <Text style={styles.disconnectMessage}>Your 15-minute call session has ended</Text>
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
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  topActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  topActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e1c64',
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  modalCost: {
    fontSize: 15,
    color: '#555',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonNo: {
    backgroundColor: 'transparent',
  },
  modalButtonYes: {
    backgroundColor: '#1e1c64',
  },
  modalButtonTextNo: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalButtonTextYes: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
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
