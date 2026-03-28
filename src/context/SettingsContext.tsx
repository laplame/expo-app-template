import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { getUserName as getStoredUserName, setUserName as setStoredUserName } from '../services/storage';

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

interface SettingsContextValue {
  language: Language;
  currency: Currency;
  userName: string | null;
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setUserName: (name: string | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getDeviceLanguage);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [userName, setUserNameState] = useState<string | null>(null);

  useEffect(() => {
    getStoredUserName().then((name) => {
      if (name != null && name.trim() !== '') setUserNameState(name);
    });
  }, []);

  const setUserName = useCallback((name: string | null) => {
    setUserNameState(name);
    setStoredUserName(name);
  }, []);

  const value = useMemo(
    () => ({ language, currency, userName, setLanguage, setCurrency, setUserName }),
    [language, currency, userName, setUserName]
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
      setLanguage: () => {},
      setCurrency: () => {},
      setUserName: () => {},
    };
  }
  return ctx;
}
