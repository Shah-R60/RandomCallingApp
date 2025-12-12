import { View, Text, FlatList } from 'react-native'
import React, { useEffect } from 'react'
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import UserListItem from '../../components/UserLIstItem';

const UserScreen = () => {
    const [Users, setUser] = React.useState([]);
    const { user } = useAuth();
    useEffect(() => {
        // Fetch users from API or context
        const fetchUsers = async () => {
            try {
                let { data: profiles, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', user?.id) // Exclude the current user
                if (error) {
                    console.error('Error fetching users:', error);  
                    throw error;
                }
                setUser(profiles);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }

        fetchUsers();
    }, []);

    return (
        <FlatList
            data={Users}
            renderItem={({ item }) => (
                <View >
                    <UserListItem user={item} />
                </View>
            )}
        />
    )
}

export default UserScreen