import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://telegrambackend-1phk.onrender.com';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor - Add auth token to requests
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and refresh token
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 [AUTH] Token expired, attempting refresh...');
        
        // Get refresh token
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post(
          `${BACKEND_URL}/api/users/refresh-token`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data.success && response.data.data.accessToken) {
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          // Save new tokens
          await AsyncStorage.setItem('@access_token', accessToken);
          await AsyncStorage.setItem('@refresh_token', newRefreshToken);

          console.log('✅ [AUTH] Token refreshed successfully');

          // Update authorization header
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process queued requests
          processQueue(null, accessToken);

          isRefreshing = false;

          // Retry original request
          return axiosInstance(originalRequest);
        } else {
          throw new Error('Failed to refresh token');
        }
      } catch (refreshError) {
        console.error('❌ [AUTH] Token refresh failed:', refreshError);
        
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear tokens and redirect to login
        await AsyncStorage.multiRemove(['@access_token', '@refresh_token', '@user']);
        
        // You can emit an event here to redirect to login screen
        // or use a navigation service
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
