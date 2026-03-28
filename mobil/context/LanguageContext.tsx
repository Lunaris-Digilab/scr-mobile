import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Locale, TranslationKey } from '../constants/translations';
import { getTranslation } from '../constants/translations';

const STORAGE_KEY = 'APP_LOCALE';

type LanguageContextValue = {
  locale: Locale | null;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKey) => string;
  isReady: boolean;
};

const defaultT = (_key: string) => '';

const LanguageContext = createContext<LanguageContextValue>({
  locale: null,
  setLocale: async () => {},
  t: defaultT,
  isReady: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored && ['en', 'de', 'es', 'tr'].includes(stored)) {
        setLocaleState(stored as Locale);
      }
      setIsReady(true);
    });
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    await SecureStore.setItemAsync(STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: keyof typeof import('../constants/translations').translations) => {
      const currentLocale = locale ?? 'tr';
      return getTranslation(currentLocale, key);
    },
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
