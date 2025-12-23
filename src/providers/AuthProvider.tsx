import React, { useEffect, PropsWithChildren, createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

type User = {
    _id: string;
    email: string;
    name: string;
    picture: string;
    stars: number;
    createdAt: string;
    updatedAt: string;
}

type AuthContext = {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    signOut: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContext>({
    user: null,
    accessToken: null,
    refreshToken: null,
    signOut: async () => {},
    refreshUserData: async () => {}
});

const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedAccessToken = await AsyncStorage.getItem('@access_token');
            const storedRefreshToken = await AsyncStorage.getItem('@refresh_token');
            const storedUser = await AsyncStorage.getItem('@user');

            if (storedAccessToken && storedUser) {
                setAccessToken(storedAccessToken);
                setRefreshToken(storedRefreshToken);
                setUser(JSON.parse(storedUser));
                
                // Refresh user data on app load
                await refreshUserData(storedAccessToken);
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
        }
    };

    const refreshUserData = async (token?: string) => {
        try {
            const currentToken = token || accessToken;
            if (!currentToken) return;

            const response = await fetch(`${BACKEND_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setUser(result.data);
                    await AsyncStorage.setItem('@user', JSON.stringify(result.data));
                }
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    const signOut = async () => {
        try {
            // Call backend logout if needed
            if (accessToken) {
                await fetch(`${BACKEND_URL}/api/users/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }).catch(() => {});
            }

            // Clear local storage
            await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, refreshToken, signOut, refreshUserData }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);