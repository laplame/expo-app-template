import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { getUserName as getStoredUserName, setUserName as setStoredUserName, getPaymentLimitLuxae, setPaymentLimitLuxae as persistPaymentLimitLuxae } from '../services/storage';

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
  /** Máximo LUXAE permitido por pago (QR Pagar). */
  paymentLimitLuxae: number;
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setUserName: (name: string | null) => void;
  setPaymentLimitLuxae: (amount: number) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getDeviceLanguage);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [userName, setUserNameState] = useState<string | null>(null);
  const [paymentLimitLuxae, setPaymentLimitLuxaeState] = useState(20);

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

  const value = useMemo(
    () => ({
      language,
      currency,
      userName,
      paymentLimitLuxae,
      setLanguage,
      setCurrency,
      setUserName,
      setPaymentLimitLuxae,
    }),
    [language, currency, userName, paymentLimitLuxae, setUserName, setPaymentLimitLuxae]
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
    };
  }
  return ctx;
}
