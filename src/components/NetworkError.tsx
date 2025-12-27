import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

interface NetworkErrorProps {
  onRetry: () => void;
}

export default function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/network.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Ooops!</Text>
      <Text style={styles.subtitle}>No Internet Connection found</Text>
      <Text style={styles.description}>Check your connection</Text>
      
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1e1b4b',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
