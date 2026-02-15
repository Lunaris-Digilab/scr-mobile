import { supabase } from './supabase';

export type GoogleAuthResult =
  | { success: true; isNewUser: boolean }
  | { success: false; cancelled: boolean; message: string };

// Google Sign-In native modülü yalnızca development build'de mevcut.
// Expo Go'da çalışmadığı için tüm import'lar lazy (dinamik) yapılır.
let _configured = false;

function getGoogleSignin() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  if (!_configured) {
    mod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    _configured = true;
  }
  return mod;
}

/**
 * Google Sign-In native modülünün kullanılabilir olup olmadığını kontrol eder.
 * Expo Go'da false döner; development build'de true döner.
 */
export function isGoogleSignInAvailable(): boolean {
  try {
    require('@react-native-google-signin/google-signin');
    return true;
  } catch {
    return false;
  }
}

/**
 * Google ile giriş/kayıt yapar.
 * Başarı durumunda Supabase oturumu otomatik oluşur.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const { GoogleSignin, isErrorWithCode, isNoActiveAccount, statusCodes } =
      getGoogleSignin();

    // Google Play Services kontrolü (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Google hesap seçimi + id token al
    const response = await GoogleSignin.signIn();

    const idToken = response.data?.idToken;

    if (!idToken) {
      return {
        success: false,
        cancelled: false,
        message: 'Google kimlik doğrulama tokeni alınamadı.',
      };
    }

    // Supabase'e idToken ile giriş yap
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return {
        success: false,
        cancelled: false,
        message: error.message,
      };
    }

    // Yeni kullanıcı mı kontrol et (created_at ~= last_sign_in_at ise yeni)
    const user = data.user;
    let isNewUser = false;
    if (user) {
      const created = new Date(user.created_at).getTime();
      const lastSignIn = new Date(
        user.last_sign_in_at ?? user.created_at
      ).getTime();
      // 10 saniye fark varsa yeni kullanıcı kabul et
      isNewUser = Math.abs(lastSignIn - created) < 10_000;
    }

    return { success: true, isNewUser };
  } catch (error: unknown) {
    try {
      const { isErrorWithCode, isNoActiveAccount, statusCodes } =
        getGoogleSignin();

      // Kullanıcı iptal etti
      if (isErrorWithCode(error)) {
        if (
          error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS
        ) {
          return { success: false, cancelled: true, message: '' };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return {
            success: false,
            cancelled: false,
            message: 'Google Play Services kullanılamıyor.',
          };
        }
      }

      if (isNoActiveAccount(error)) {
        return {
          success: false,
          cancelled: true,
          message: '',
        };
      }
    } catch {
      // Google Sign-In modülü yüklenemiyorsa (Expo Go)
    }

    return {
      success: false,
      cancelled: false,
      message: (error as Error).message ?? 'Bilinmeyen hata',
    };
  }
}
