import * as SecureStore from 'expo-secure-store';

const ONBOARDING_DONE_KEY = 'ONBOARDING_DONE';
const SKIN_PROFILE_KEY = 'ONBOARDING_SKIN_PROFILE';

export interface SkinProfile {
  skin_type: string | null;
  skin_concerns: string[];
}

export async function isOnboardingDone(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_DONE_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setOnboardingDone(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, '1');
}

export async function getSkinProfile(): Promise<SkinProfile | null> {
  try {
    const raw = await SecureStore.getItemAsync(SKIN_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { skin_type?: string | null; skin_concerns?: string[] };
    return {
      skin_type: parsed.skin_type ?? null,
      skin_concerns: Array.isArray(parsed.skin_concerns) ? parsed.skin_concerns : [],
    };
  } catch {
    return null;
  }
}

export async function setSkinProfile(profile: SkinProfile): Promise<void> {
  await SecureStore.setItemAsync(SKIN_PROFILE_KEY, JSON.stringify(profile));
}

export async function clearSkinProfile(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SKIN_PROFILE_KEY);
  } catch {
    // ignore
  }
}
