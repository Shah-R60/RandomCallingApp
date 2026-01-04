import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView, Modal, Text, Pressable } from 'react-native';
import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from '@expo/vector-icons';
import { useTopic } from '../../providers/TopicProvider';
import TopicCard, { TopicReference } from '../../components/TopicCard';
import TopicCardSkeleton from '../../components/TopicCardSkeleton';
import SwipeButton from 'rn-swipe-button';
import { useTheme } from '../../providers/ThemeProvider';
import axiosInstance from '../../utils/axiosInstance';

export default function HomeScreen() {
  const swipeButtonRef = useRef<any>(null);
  const [warningData, setWarningData] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { topic, loading: topicLoading } = useTopic();
  const { theme } = useTheme();
  const handleFindRandomUser = () => {
    router.push('/waiting');
  };

  useEffect(() => {
    // Fetch ban/warning status when landing on home
    const fetchStatus = async () => {
      try {
        const res = await axiosInstance.get('/api/reports/ban-status');
        const data = res.data?.data;
        if (!data) return;

        if (data.isBanned) {
          setWarningData({
            type: 'banned',
            banExpiresAt: data.banExpiresAt,
            weeklyBanCount: data.weeklyBanCount,
          });
          setShowWarningModal(true);
        }
      } catch (err) {
        // Ignore if unauthenticated or network issues on home
      }
    };

    fetchStatus();
  }, []);

  const handleCloseWarning = () => {
    setShowWarningModal(false);
    setWarningData(null);
  };

  const formatTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return '0m';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 380,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#111827',
    },
    modalMessage: {
      fontSize: 15,
      color: '#374151',
      lineHeight: 22,
      marginBottom: 14,
    },
    modalTimer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#f3f4f6',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    modalTimerText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#111827',
    },
    modalSubtext: {
      fontSize: 13,
      color: '#6b7280',
      marginBottom: 18,
    },
    modalButton: {
      backgroundColor: '#111827',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="auto" />

      {/* Warning/Ban Modal */}
      <Modal
        visible={showWarningModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseWarning}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {warningData?.type === 'banned' ? (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name="lock-closed" size={26} color="#ef4444" />
                  <Text style={styles.modalTitle}>🚫 Account Temporarily Restricted</Text>
                </View>
                <Text style={styles.modalMessage}>
                  You've been reported 3 times for violating community guidelines. Call feature locked.
                </Text>
                <View style={styles.modalTimer}>
                  <Ionicons name="time-outline" size={18} color="#4b5563" />
                  <Text style={styles.modalTimerText}>
                    Call feature unlocked in: {formatTimeRemaining(warningData?.banExpiresAt)}
                  </Text>
                </View>
                <Text style={styles.modalSubtext}>You can still browse topics and read content.</Text>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name="warning" size={26} color="#f59e0b" />
                  <Text style={styles.modalTitle}>
                    {warningData?.reportCount === 2 ? '⚠️ Second Warning' : '⚠️ Warning'}
                  </Text>
                </View>
                <Text style={styles.modalMessage}>
                  {warningData?.reportCount === 2
                    ? "This is your 2nd restriction this week. One more and you'll face a 7-day ban."
                    : "You've been reported for violating community guidelines. Please be respectful in your calls."}
                </Text>
              </>
            )}
            <Pressable style={styles.modalButton} onPress={handleCloseWarning}>
              <Text style={styles.modalButtonText}>I Understand</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Today's Topic */}
      {topicLoading ? (
        <TopicCardSkeleton />
      ) : topic ? (
        <TopicCard topic={topic} />
      ) : null}

      {/* Call Button */}
      <View style={styles.callButtonSection}>
        <View style={styles.callButtonContainer}>
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
        </View>
      </View>

      {/* Reference Section - Below Call Button */}
      {topic && <TopicReference topic={topic} />}
    </ScrollView>
  );
}