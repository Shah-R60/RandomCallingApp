import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import theme from '../constants/Theme';

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
    backgroundColor: theme.colors.white,
    borderRadius: 0,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topicLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  mainImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.borderRadius.md,
  },
  referenceSection: {
    marginHorizontal: 5,
    marginBottom: theme.spacing.lg,
  },
  referenceHeader: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  referenceTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
  },
  referenceContent: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  contentVideo: {
    width: '100%',
    height: 220,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.shadow,
  },
});
