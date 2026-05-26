import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  getUserName as getStoredUserName,
  setUserName as setStoredUserName,
  getPaymentLimitLuxae,
  setPaymentLimitLuxae as persistPaymentLimitLuxae,
  getSettingsLanguage,
  setSettingsLanguage as persistSettingsLanguage,
  getSettingsCurrency,
  setSettingsCurrency as persistSettingsCurrency,
  getSettingsAppTheme,
  setSettingsAppTheme as persistSettingsAppTheme,
  getSettingsAppBackgroundUri,
  setSettingsAppBackgroundUri as persistSettingsAppBackgroundUri,
  type StoredAppTheme,
} from '../services/storage';
import {
  DEFAULT_APP_BACKGROUND_URI,
  normalizeAppBackgroundUri,
} from '../constants/appBackground';
import {
  DEFAULT_APP_THEME_ID,
  normalizeAppTheme,
  type AppThemeId,
} from '../theme/appThemes';

const getDeviceLanguage = (): 'en' | 'es' => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.startsWith('es') ? 'es' : 'en';
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
};

export type Language = 'en' | 'es';
export type Currency = 'USD' | 'MXN';
export type { AppThemeId };
/** @deprecated Use AppThemeId */
export type ColorScheme = AppThemeId;

interface SettingsContextValue {
  language: Language;
  currency: Currency;
  userName: string | null;
  /** Máximo LUXAE permitido por pago (QR Pagar). */
  paymentLimitLuxae: number;
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setUserName: (name: string | null) => void;
  setPaymentLimitLuxae: (amount: number) => Promise<void>;
  appTheme: AppThemeId;
  setAppTheme: (theme: AppThemeId) => void;
  /** @deprecated Use appTheme */
  colorScheme: AppThemeId;
  /** @deprecated Use setAppTheme */
  setColorScheme: (theme: AppThemeId) => void;
  /** Imagen de fondo (Home y paneles colapsables de Social Layer). */
  appBackgroundUri: string;
  setAppBackgroundUri: (uri: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getDeviceLanguage);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [userName, setUserNameState] = useState<string | null>(null);
  const [paymentLimitLuxae, setPaymentLimitLuxaeState] = useState(20);
  const [appTheme, setAppThemeState] = useState<AppThemeId>(DEFAULT_APP_THEME_ID);
  const [appBackgroundUri, setAppBackgroundUriState] = useState(DEFAULT_APP_BACKGROUND_URI);

  useEffect(() => {
    let cancelled = false;
    getSettingsLanguage().then((stored) => {
      if (!cancelled && stored) setLanguage(stored);
    });
    getSettingsCurrency().then((stored) => {
      if (!cancelled && stored) setCurrency(stored);
    });
    getSettingsAppTheme().then((stored) => {
      if (!cancelled) setAppThemeState(normalizeAppTheme(stored));
    });
    getSettingsAppBackgroundUri().then((stored) => {
      if (!cancelled) setAppBackgroundUriState(normalizeAppBackgroundUri(stored));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    getStoredUserName().then((name) => {
      if (name != null && name.trim() !== '') setUserNameState(name);
    });
  }, []);

  useEffect(() => {
    getPaymentLimitLuxae().then(setPaymentLimitLuxaeState);
  }, []);

  const setUserName = useCallback((name: string | null) => {
    setUserNameState(name);
    setStoredUserName(name);
  }, []);

  const setPaymentLimitLuxae = useCallback(async (amount: number) => {
    await persistPaymentLimitLuxae(amount);
    const next = await getPaymentLimitLuxae();
    setPaymentLimitLuxaeState(next);
  }, []);

  const setLanguageAndPersist = useCallback((lang: Language) => {
    setLanguage(lang);
    persistSettingsLanguage(lang);
  }, []);

  const setCurrencyAndPersist = useCallback((curr: Currency) => {
    setCurrency(curr);
    persistSettingsCurrency(curr);
  }, []);

  const setAppThemeAndPersist = useCallback((theme: AppThemeId) => {
    const next = normalizeAppTheme(theme);
    setAppThemeState(next);
    persistSettingsAppTheme(next as StoredAppTheme);
  }, []);

  const setAppBackgroundUriAndPersist = useCallback((uri: string) => {
    const next = normalizeAppBackgroundUri(uri);
    setAppBackgroundUriState(next);
    persistSettingsAppBackgroundUri(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      currency,
      userName,
      paymentLimitLuxae,
      setLanguage: setLanguageAndPersist,
      setCurrency: setCurrencyAndPersist,
      setUserName,
      setPaymentLimitLuxae,
      appTheme,
      setAppTheme: setAppThemeAndPersist,
      colorScheme: appTheme,
      setColorScheme: setAppThemeAndPersist,
      appBackgroundUri,
      setAppBackgroundUri: setAppBackgroundUriAndPersist,
    }),
    [
      language,
      currency,
      userName,
      paymentLimitLuxae,
      setLanguageAndPersist,
      setCurrencyAndPersist,
      setUserName,
      setPaymentLimitLuxae,
      appTheme,
      setAppThemeAndPersist,
      appBackgroundUri,
      setAppBackgroundUriAndPersist,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return {
      language: getDeviceLanguage(),
      currency: 'USD' as Currency,
      userName: null as string | null,
      paymentLimitLuxae: 20,
      setLanguage: () => {},
      setCurrency: () => {},
      setUserName: () => {},
      setPaymentLimitLuxae: async () => {},
      appTheme: DEFAULT_APP_THEME_ID,
      setAppTheme: () => {},
      colorScheme: DEFAULT_APP_THEME_ID,
      setColorScheme: () => {},
      appBackgroundUri: DEFAULT_APP_BACKGROUND_URI,
      setAppBackgroundUri: () => {},
    };
  }
  return ctx;
}
