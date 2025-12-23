import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './AuthProvider';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

export default function VideoProvider({ children }: PropsWithChildren) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (!user || !accessToken) {
      return;
    }

    const initVideoClient = async () => {
      try {
        // Fetch Stream token from backend
        const response = await fetch(`${BACKEND_URL}/api/users/stream-token`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const result = await response.json();

        if (!result.success) {
          console.error('❌ Failed to get Stream token:', result.message);
          return;
        }

        const { streamToken, streamUserId, streamApiKey, userName, userImage } = result.data;

        // Initialize Stream client with token from backend
        const client = new StreamVideoClient({
          apiKey: streamApiKey,
          user: {
            id: streamUserId,
            name: userName,
            image: userImage,
          },
          token: streamToken,
          options: {
            logLevel: 'info',
          },
        });

        setVideoClient(client);
        console.log('✅ Stream Video Client initialized');
      } catch (error) {
        console.error('❌ Error initializing Stream Video Client:', error);
      }
    };

    initVideoClient();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser();
        setVideoClient(null);
      }
    };
  }, [user?.id, accessToken]);

  if (!videoClient) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
}