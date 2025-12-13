import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const WaitingAnimation = () => {
  // Array of flame/fire frame images
  const frameImages = [
    require('../../assets/Frame1.png'),
    require('../../assets/Frame2.png'),
    require('../../assets/Frame3.png'),
    require('../../assets/Frame4.png'),
  ];

  const [currentFrame, setCurrentFrame] = useState(0);

  // Switch frames every 150ms for smooth animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prevFrame) => (prevFrame + 1) % frameImages.length);
    }, 1000); // 150ms per frame = ~6.67 fps

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={frameImages[currentFrame]} 
        style={styles.frame} 
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
  },
});

export default WaitingAnimation;
