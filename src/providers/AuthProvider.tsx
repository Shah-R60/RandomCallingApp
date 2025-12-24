import React, { useEffect, PropsWithChildren, createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axiosInstance from '../utils/axiosInstance';

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
    setAuthData: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContext>({
    user: null,
    accessToken: null,
    refreshToken: null,
    signOut: async () => {},
    refreshUserData: async () => {},
    setAuthData: async () => {}
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

            // Use axios instance with auto-refresh
            const response = await axiosInstance.get('/api/users/me');

            if (response.data.success && response.data.data) {
                setUser(response.data.data);
                await AsyncStorage.setItem('@user', JSON.stringify(response.data.data));
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
            // If refresh fails, user might need to login again
        }
    };

    const setAuthData = async (userData: User, newAccessToken: string, newRefreshToken: string) => {
        try {
            setUser(userData);
            setAccessToken(newAccessToken);
            setRefreshToken(newRefreshToken);
            await AsyncStorage.setItem('@access_token', newAccessToken);
            await AsyncStorage.setItem('@refresh_token', newRefreshToken);
            await AsyncStorage.setItem('@user', JSON.stringify(userData));
        } catch (error) {
            console.error('Error setting auth data:', error);
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 [LOGOUT] Starting logout process...');
            
            // Call backend logout if needed
            if (accessToken) {
                console.log('🚪 [LOGOUT] Calling backend logout...');
                await fetch(`${BACKEND_URL}/api/users/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }).catch((error) => {
                    console.error('Backend logout error:', error);
                });
            }

            // Sign out from Google
            try {
                console.log('🚪 [LOGOUT] Signing out from Google...');
                await GoogleSignin.signOut();
                console.log('🚪 [LOGOUT] Google sign-out successful');
            } catch (error) {
                console.error('Google sign-out error:', error);
                // Continue with logout even if Google sign-out fails
            }

            // Clear local storage
            console.log('🚪 [LOGOUT] Clearing local storage...');
            await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
            
            // Clear state
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            
            console.log('🚪 [LOGOUT] Logout complete');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, refreshToken, signOut, refreshUserData, setAuthData }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;

export const useAuth = () => useContext(AuthContext);