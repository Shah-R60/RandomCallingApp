import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { tokenProvider } from '../utils/TokenProvider';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;

export default function VideoProvider({ children }: PropsWithChildren) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(
    null
  );
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      return;
    }

    const initVideoClient = async () => {
      try {
        const user = {
          id: profile.id,
          name: profile.full_name,
          image: profile.avatar_url 
            ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
            : undefined,
        };
        
        // Initialize client with audio-only configuration
        const client = new StreamVideoClient({ 
          apiKey, 
          user, 
          tokenProvider,
          options: {
            logLevel: 'info',
          }
        });
        
        setVideoClient(client);
      } catch (error) {
        console.error('❌ Error initializing Audio Client:', error);
        console.error('Audio calls will not work. Check network connectivity.');
      }
    };

    initVideoClient();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser();
      }
    };
  }, [profile?.id]);

  if (!videoClient) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
}