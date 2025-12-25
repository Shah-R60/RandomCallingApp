import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import axiosInstance from '../utils/axiosInstance';

interface Topic {
  _id: string;
  title: string;
  image: string;
  description: Array<{
    type: 'text' | 'image' | 'video';
    content: string;
    order: number;
    _id: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TopicContextType {
  topic: Topic | null;
  loading: boolean;
  error: string | null;
  refetchTopic: () => Promise<void>;
}

const TopicContext = createContext<TopicContextType>({} as TopicContextType);

export const TopicProvider = ({ children }: { children: React.ReactNode }) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (accessToken) {
      fetchTopic();
    }
  }, [accessToken]);

  const fetchTopic = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🌐 [TOPIC] Fetching today\'s topic');
      
      const response = await axiosInstance.get('/api/topic/getNewestTopic');
      const result = response.data;
      
      if (result.success && result.data) {
        setTopic(result.data);
        console.log('✅ [TOPIC] Topic loaded:', result.data.title);
      } else {
        throw new Error(result.message || 'Failed to fetch topic');
      }
    } catch (err: any) {
      console.error('❌ [TOPIC ERROR]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TopicContext.Provider value={{ topic, loading, error, refetchTopic: fetchTopic }}>
      {children}
    </TopicContext.Provider>
  );
};

export const useTopic = () => {
  const context = useContext(TopicContext);
  if (!context) {
    throw new Error('useTopic must be used within TopicProvider');
  }
  return context;
};
