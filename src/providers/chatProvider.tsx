import { Slot, Stack } from 'expo-router';
import { useEffect, useState, PropsWithChildren } from 'react';
import { StreamChat } from "stream-chat";
import { ActivityIndicator } from 'react-native';
import { Chat, OverlayProvider } from "stream-chat-expo";
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { tokenProvider } from '../utils/TokenProvider';
import React from "react";
// Use the API key directly for now to test
const API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY;
// const API_KEY = "au592tv2s8hq";
console.log("API Key:", API_KEY);
const client = StreamChat.getInstance(API_KEY);


const ChatProvider = ({ children }: PropsWithChildren) => {


  const [isReady, setIsReady] = useState(false);

  const { profile } = useAuth();
  // console.log(user);

  useEffect(() => {

      let didConnect = false; 
    if (!profile) {
      return;
    }
    const connect = async () => {

      console.log('Connecting user to chat client:', profile.id);
      try {
        // Test token provider first
        const token = await tokenProvider();
        console.log('Token received successfully');
        
        const imageUrl = profile.avatar_url
          ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
          : undefined; 

        await client.connectUser(
          {
            id: profile.id,
            name: profile.full_name || 'New User',
            image: imageUrl,
          },
          tokenProvider
        );
        didConnect = true; 
        setIsReady(true);

      }
      catch (error) {
        console.error('❌ Error connecting user to Stream Chat:', error);
        console.error('This usually means:');
        console.error('1. Network connection issue (cannot reach Supabase/Stream)');
        console.error('2. Supabase Edge Function not deployed or not working');
        console.error('3. Invalid Stream API credentials');
        // Still set ready to true so app doesn't hang, but chat won't work
        setIsReady(true);
      }

    };

    connect();

    return () => {
      if (didConnect) {
        client.disconnectUser();
      }
      setIsReady(false);
    }
  }, [profile?.id]);

  // Show loading while connecting
  if (!isReady) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center', alignContent: 'center' }} />;
  }

  return (

    <OverlayProvider>
      <Chat client={client}>
        {children}
      </Chat>
    </OverlayProvider>
  )
}

export default ChatProvider;