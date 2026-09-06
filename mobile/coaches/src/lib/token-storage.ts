import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Namespaced per app. On web both apps are served from localhost, and
 * storage is scoped by origin — so a shared key means whichever app last
 * signed in on a given port hands its token to the other one.
 */
const TOKEN_KEY = 'coachos.coach.access_token';

/**
 * In-memory fallback so the app never crashes if native storage is
 * unavailable (e.g. web without localStorage, or Expo Go edge cases).
 */
const memoryStorage: Record<string, string> = {};

function getWebStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
}

export async function saveAccessToken(token: string): Promise<void> {
  if (!token) return;
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem(TOKEN_KEY, token);
      return;
    }
    memoryStorage[TOKEN_KEY] = token;
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    memoryStorage[TOKEN_KEY] = token;
  }
}

export async function loadAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) return storage.getItem(TOKEN_KEY);
    return memoryStorage[TOKEN_KEY] ?? null;
  }
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token ?? null;
  } catch {
    return memoryStorage[TOKEN_KEY] ?? null;
  }
}

export async function clearAccessToken(): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) storage.removeItem(TOKEN_KEY);
    delete memoryStorage[TOKEN_KEY];
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore — fall through to memory cleanup
  }
  delete memoryStorage[TOKEN_KEY];
}
