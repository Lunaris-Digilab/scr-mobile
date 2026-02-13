import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Sunucu adresi .env'de EXPO_PUBLIC_SUPABASE_URL (örn. https://api.glowist.app)
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Expo Go, iOS'ta doküman yolunu ExponentExperienceData/@anonymous yapıyor;
// @ karakteri dosya adında kullanılamadığı için AsyncStorage hata veriyor.
// Bu yüzden oturumu SecureStore (Keychain) ile saklıyoruz; bu yol kullanılmaz.
function safeKey(key: string): string {
  return key.replace(/@/g, '__at__');
}

const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(safeKey(key));
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(safeKey(key), value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(safeKey(key));
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
