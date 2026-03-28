import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@link4deal/device_id';

async function getNativeDeviceSource(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      return Application.androidId ?? '';
    }
    if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      return iosId ?? '';
    }
    return `${Platform.OS}-device`;
  } catch {
    return `${Platform.OS}-device`;
  }
}

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim().length > 0) return existing;

    const nativeSource = await getNativeDeviceSource();
    const seed = `${nativeSource}|${Date.now()}|${Math.random()}`;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, seed);
    const generated = `dev_${hash.slice(0, 24)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    const fallback = `dev_${Date.now().toString(36)}`;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, fallback);
    } catch {
      // ignore
    }
    return fallback;
  }
}
