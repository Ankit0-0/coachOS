import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AppearanceMode } from './provider';

const MODES: readonly AppearanceMode[] = ['system', 'light', 'dark'];

function isMode(value: unknown): value is AppearanceMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/** Same stores the apps keep their session in: SecureStore, localStorage on web. */
export async function loadMode(key: string): Promise<AppearanceMode | null> {
  try {
    const value =
      Platform.OS === 'web' ? (globalThis.localStorage?.getItem(key) ?? null) : await SecureStore.getItemAsync(key);
    return isMode(value) ? value : null;
  } catch {
    return null;
  }
}

export async function saveMode(key: string, mode: AppearanceMode): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, mode);
    else await SecureStore.setItemAsync(key, mode);
  } catch {
    // Not persisted; still applies for this session.
  }
}
