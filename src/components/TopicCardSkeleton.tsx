import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

const TopicCardSkeleton = () => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  // Pulsing animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const skeletonStyle = {
    backgroundColor: theme.colors.border,
    opacity,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundLight }]}>
      {/* Topic Label Skeleton */}
      <Animated.View style={[styles.labelSkeleton, skeletonStyle]} />
      
      {/* Title Skeleton - 2 lines */}
      <Animated.View style={[styles.titleSkeleton, skeletonStyle]} />
      <Animated.View style={[styles.titleSkeletonShort, skeletonStyle]} />
      
      {/* Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, skeletonStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  labelSkeleton: {
    width: 120,
    height: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'center',
  },
  titleSkeleton: {
    width: '100%',
    height: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  titleSkeletonShort: {
    width: '60%',
    height: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  imageSkeleton: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
});

export default TopicCardSkeleton;
