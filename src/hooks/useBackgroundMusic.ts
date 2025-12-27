import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File } from 'expo-file-system';
import { Audio } from 'expo-av';
import axiosInstance from '../utils/axiosInstance';

const MUSIC_CACHE_KEY = '@bg_music_meta';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredMusicMeta {
  _id: string;
  url: string;
  createdAt: string;
  localPath: string | null;
  lastChecked: number;
}

const ensureFileExists = async (uri: string | null) => {
  if (!uri) return false;
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
};

export const useBackgroundMusic = () => {
  const [isReady, setIsReady] = useState(false);
  const [meta, setMeta] = useState<StoredMusicMeta | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('❌ [MUSIC] Failed to set audio mode', error);
      }
    };

    configureAudio();

    return () => {
      stopMusic();
    };
  }, []);

  const saveMeta = async (data: StoredMusicMeta) => {
    setMeta(data);
    try {
      await AsyncStorage.setItem(MUSIC_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('❌ [MUSIC] Failed to persist metadata', error);
    }
  };

  const loadMeta = async (): Promise<StoredMusicMeta | null> => {
    try {
      const raw = await AsyncStorage.getItem(MUSIC_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredMusicMeta;
    } catch (error) {
      console.error('❌ [MUSIC] Failed to load metadata', error);
      return null;
    }
  };

  const downloadToCache = async (url: string, id: string, oldPath?: string | null) => {
    const fileName = `music_${id}.mp3`;
    const destFile = new File(Paths.cache, fileName);

    // Clean up old file if provided
    if (oldPath && oldPath !== destFile.uri) {
      try {
        const oldFile = new File(oldPath);
        if (oldFile.exists) {
          oldFile.delete();
        }
      } catch (error) {
        console.warn('⚠️ [MUSIC] Failed to delete old file', error);
      }
    }

    try {
      const downloadedFile = await File.downloadFileAsync(url, destFile);
      return downloadedFile.uri;
    } catch (error) {
      console.error('❌ [MUSIC] Download failed', error);
      return null;
    }
  };

  const ensureLatestMusic = async () => {
    const now = Date.now();
    const stored = await loadMeta();

    // If checked within 24h and file exists, reuse
    if (stored && now - stored.lastChecked < CACHE_DURATION_MS) {
      const exists = await ensureFileExists(stored.localPath);
      if (exists) {
        setMeta(stored);
        setSourceUri(stored.localPath);
        setIsReady(true);
        return stored;
      }
    }

    // Fetch latest from backend
    try {
      const response = await axiosInstance.get('/api/music/latest');
      const latest = response.data?.data;

      if (!latest?._id || !latest?.url) {
        throw new Error('Invalid music payload');
      }

      // If same track and cached file exists, reuse
      if (stored && stored._id === latest._id) {
        const exists = await ensureFileExists(stored.localPath);
        if (exists) {
          const refreshed = { ...stored, lastChecked: now };
          await saveMeta(refreshed);
          setSourceUri(stored.localPath);
          setIsReady(true);
          return refreshed;
        }
      }

      // Download new track
      const localUri = await downloadToCache(latest.url, latest._id, stored?.localPath);
      const newMeta: StoredMusicMeta = {
        _id: latest._id,
        url: latest.url,
        createdAt: latest.createdAt || new Date().toISOString(),
        localPath: localUri,
        lastChecked: now,
      };
      await saveMeta(newMeta);
      setSourceUri(localUri || latest.url);
      setIsReady(true);
      return newMeta;
    } catch (error) {
      console.error('❌ [MUSIC] Failed to fetch latest music', error);
      // Fall back to stored if available
      if (stored) {
        setMeta(stored);
        setSourceUri(stored.localPath || stored.url);
        setIsReady(true);
        return stored;
      }
      setIsReady(false);
      return null;
    }
  };

  const playWaitingMusic = async () => {
    try {
      const latestMeta = await ensureLatestMusic();
      const uriToPlay = latestMeta?.localPath || latestMeta?.url || sourceUri;
      if (!uriToPlay) return;

      // Stop previous sound if any
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: uriToPlay },
        { shouldPlay: true, isLooping: true, volume: 0.3 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('❌ [MUSIC] Failed to play waiting music', error);
    }
  };

  const stopMusic = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch (error) {
      console.error('❌ [MUSIC] Failed to stop music', error);
    } finally {
      soundRef.current = null;
    }
  };

  return {
    isReady,
    meta,
    ensureLatestMusic,
    playWaitingMusic,
    stopMusic,
  };
};
