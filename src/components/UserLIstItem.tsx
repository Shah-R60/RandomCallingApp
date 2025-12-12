import { View, Text , Pressable } from 'react-native'
import React from 'react'
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../providers/AuthProvider';
import { router } from 'expo-router';

const UserListItem = ({ user }) => {
    const  {client} = useChatContext();
    const {user:me} = useAuth();
    const onPress = async()=>{
        const channel = client.channel('messaging', {
            members: [me.id, user.id]
        });
        channel.watch();

        try{
            await channel.watch();
            router.replace(`/(home)/channel/${channel.cid}`);
        }catch(error){
            console.error('Error creating channel:', error);
        }
    }
  return (
    <Pressable onPress={onPress}>
      <View style={{ padding: 12, borderBottomWidth: 1, backgroundColor: 'white', borderBottomColor: '#ff0f0fff' }}>
        <Text style={{ fontWeight: 'bold' }}>{user.full_name}</Text>
      </View>
    </Pressable>
  )
}

export default UserListItem