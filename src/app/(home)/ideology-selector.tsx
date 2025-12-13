import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { useTheme, IdeologyType } from '../../providers/ThemeProvider';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // 40px padding on each side
const ZONE_WIDTH = SLIDER_WIDTH / 3;

export default function IdeologySelectorScreen() {
  const { theme, ideology, setIdeology } = useTheme();
  const [selectedIdeology, setSelectedIdeology] = useState<IdeologyType>(ideology);
  
  // Initial position based on current ideology
  const getInitialPosition = () => {
    if (ideology === 'leftWing') return 0;
    if (ideology === 'neutral') return SLIDER_WIDTH / 2;
    return SLIDER_WIDTH;
  };

  const pan = useRef(new Animated.Value(getInitialPosition())).current;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.backgroundLight,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 40,
      color: theme.colors.textSecondary,
    },
    currentSelection: {
      padding: 24,
      borderRadius: 16,
      marginBottom: 40,
      alignItems: 'center',
    },
    currentLabel: {
      fontSize: 14,
      color: '#fff',
      opacity: 0.9,
      marginBottom: 4,
    },
    currentValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    sliderContainer: {
      marginBottom: 30,
    },
    zoneLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 10,
    },
    zoneLabel: {
      alignItems: 'center',
      flex: 1,
    },
    colorIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginBottom: 6,
    },
    zoneLabelText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      textAlign: 'center',
    },
    activeZoneText: {
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    sliderTrack: {
      height: 60,
      backgroundColor: theme.colors.border,
      borderRadius: 30,
      position: 'relative',
      overflow: 'hidden',
    },
    colorZones: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
    },
    colorZone: {
      flex: 1,
      opacity: 0.3,
    },
    thumb: {
      position: 'absolute',
      top: 5,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 3,
      borderColor: theme.colors.white,
    },
    hint: {
      fontSize: 14,
      textAlign: 'center',
      fontStyle: 'italic',
      color: theme.colors.textLight,
    },
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newValue = getInitialPosition() + gestureState.dx;
        
        // Clamp value between 0 and SLIDER_WIDTH
        if (newValue < 0) newValue = 0;
        if (newValue > SLIDER_WIDTH) newValue = SLIDER_WIDTH;
        
        pan.setValue(newValue);
        
        // Determine ideology based on position
        if (newValue < ZONE_WIDTH) {
          setSelectedIdeology('leftWing');
        } else if (newValue > ZONE_WIDTH * 2) {
          setSelectedIdeology('rightWing');
        } else {
          setSelectedIdeology('neutral');
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        let finalPosition = getInitialPosition() + gestureState.dx;
        
        // Clamp
        if (finalPosition < 0) finalPosition = 0;
        if (finalPosition > SLIDER_WIDTH) finalPosition = SLIDER_WIDTH;
        
        // Snap to zones
        let snapPosition: number;
        let finalIdeology: IdeologyType;
        
        if (finalPosition < ZONE_WIDTH) {
          snapPosition = 0;
          finalIdeology = 'leftWing';
        } else if (finalPosition > ZONE_WIDTH * 2) {
          snapPosition = SLIDER_WIDTH;
          finalIdeology = 'rightWing';
        } else {
          snapPosition = SLIDER_WIDTH / 2;
          finalIdeology = 'neutral';
        }
        
        // Animate to snap position
        Animated.spring(pan, {
          toValue: snapPosition,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();
        
        setSelectedIdeology(finalIdeology);
        setIdeology(finalIdeology);
      },
    })
  ).current;

  const getIdeologyColor = (type: IdeologyType) => {
    if (type === 'leftWing') return '#138808';
    if (type === 'rightWing') return '#ec5e17ff';
    return '#000080';
  };

  const getIdeologyLabel = (type: IdeologyType) => {
    if (type === 'leftWing') return 'Left Wing';
    if (type === 'rightWing') return 'Right Wing';
    return 'Neutral';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={theme.colors.textPrimary}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Type Selector
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Select Your Type
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Slide to change your preferred Type type
        </Text>

        {/* Current Selection Display */}
        <View style={[styles.currentSelection, { backgroundColor: getIdeologyColor(selectedIdeology) }]}>
          <Text style={styles.currentLabel}>Current Selection</Text>
          <Text style={styles.currentValue}>{getIdeologyLabel(selectedIdeology)}</Text>
        </View>

        {/* Slider Container */}
        <View style={styles.sliderContainer}>
          {/* Zone Labels */}
          <View style={styles.zoneLabels}>
            <View style={styles.zoneLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#138808' }]} />
              <Text style={[styles.zoneLabelText, selectedIdeology === 'leftWing' && styles.activeZoneText]}>
                Left Wing
              </Text>
            </View>
            <View style={styles.zoneLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#000080' }]} />
              <Text style={[styles.zoneLabelText, selectedIdeology === 'neutral' && styles.activeZoneText]}>
                Neutral
              </Text>
            </View>
            <View style={styles.zoneLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#FF9933' }]} />
              <Text style={[styles.zoneLabelText, selectedIdeology === 'rightWing' && styles.activeZoneText]}>
                Right Wing
              </Text>
            </View>
          </View>

          {/* Slider Track */}
          <View style={styles.sliderTrack}>
            {/* Color zones background */}
            <View style={styles.colorZones}>
              <View style={[styles.colorZone, { backgroundColor: '#138808' }]} />
              <View style={[styles.colorZone, { backgroundColor: '#000080' }]} />
              <View style={[styles.colorZone, { backgroundColor: '#FF9933' }]} />
            </View>

            {/* Slider Thumb */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.thumb,
                {
                  backgroundColor: getIdeologyColor(selectedIdeology),
                  transform: [{ translateX: pan }],
                },
              ]}
            >
              <Ionicons name="ellipse" size={16} color="#fff" />
            </Animated.View>
          </View>
        </View>

        <Text style={styles.hint}>
          💡 Your selection will be saved automatically
        </Text>
      </View>
    </View>
  );
}
