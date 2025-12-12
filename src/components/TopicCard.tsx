import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface ContentBlock {
  type: 'text' | 'image' | 'video';
  content: string;
  order: number;
  _id: string;
}

interface Topic {
  _id: string;
  title: string;
  image: string;
  description: ContentBlock[];
  createdAt: string;
  updatedAt: string;
}

interface TopicCardProps {
  topic: Topic;
}

// Component for just the topic header (title + image)
export default function TopicCard({ topic }: TopicCardProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.topicLabel}>TODAY'S TOPIC</Text>
      <Text style={styles.title}>{topic.title}</Text>
      
      <Image
        source={{ uri: topic.image }}
        style={styles.mainImage}
        resizeMode="cover"
      />
    </View>
  );
}

// Component for the reference section (description content)
export function TopicReference({ topic }: TopicCardProps) {
  const renderContent = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <Text key={block._id} style={styles.contentText}>
            {block.content}
          </Text>
        );
      case 'image':
        return (
          <Image
            key={block._id}
            source={{ uri: block.content }}
            style={styles.contentImage}
            resizeMode="cover"
          />
        );
      case 'video':
        return (
          <Video
            key={block._id}
            source={{ uri: block.content }}
            style={styles.contentVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
          />
        );
      default:
        return null;
    }
  };

  if (!topic.description || topic.description.length === 0) {
    return null;
  }

  return (
    <View style={styles.referenceSection}>
      <View style={styles.referenceHeader}>
        <Text style={styles.referenceTitle}>Reference</Text>
      </View>
      <View style={styles.referenceContent}>
        {topic.description
          .sort((a, b) => a.order - b.order)
          .map((block) => renderContent(block))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  referenceSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  referenceHeader: {
    backgroundColor: '#1e1b4b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  referenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  referenceContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentVideo: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#000',
  },
});
