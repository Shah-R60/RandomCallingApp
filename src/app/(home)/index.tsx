import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ScrollView } from 'react-native';
import React, { useRef } from "react";
import { Ionicons } from '@expo/vector-icons';
import { useTopic } from '../../providers/TopicProvider';
import TopicCard, { TopicReference } from '../../components/TopicCard';
import TopicCardSkeleton from '../../components/TopicCardSkeleton';
import SwipeButton from 'rn-swipe-button';
import { useTheme } from '../../providers/ThemeProvider';

export default function HomeScreen() {
  const swipeButtonRef = useRef<any>(null);
  const { topic, loading: topicLoading } = useTopic();
  const { theme } = useTheme();
  const handleFindRandomUser = () => {
    router.push('/waiting');
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